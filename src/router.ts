import {
  cacheStaleFor,
  canBeCached,
  ddUrl,
  getETagFromRequest,
  getETagFromResponse,
  isBrowserRequestingPages,
  requestKey,
} from "./commons.ts";

const CACHE_TIME_MAX_SECONDS = 15;
const CACHE_TIME_MIN_SECONDS = 10;

const cachesPromise = [caches.open("default"), caches.open("pages")];
// Export a default object containing event handlers
export default {
  async fetch(
    request: Request,
    _env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const [defaultCache, pagesCache] = await Promise.all(cachesPromise);

    const reqUrl = new URL(request.url);
    const targetUrl = reqUrl.searchParams.get("targetUrl") ?? ddUrl(request);

    if (!isBrowserRequestingPages(request)) {
      const cachedResponse = await defaultCache.match(request);
      return cachedResponse ?? fetch(targetUrl, request).then((response) => {
        if (canBeCached(request, response)) {
          const copiedResponse = new Response(response.body, response);
          ctx.waitUntil(defaultCache.put(request, copiedResponse.clone()));
          return copiedResponse;
        }
        return response;
      });
    }
    const timeSecondsTtl = CACHE_TIME_MIN_SECONDS +
      (Math.floor(Math.random() * CACHE_TIME_MAX_SECONDS));

    const cacheStale = cacheStaleFor(
      request,
      timeSecondsTtl,
      pagesCache,
      ctx,
    );

    const requestETag = getETagFromRequest(request);
    console.log("request ETag", requestETag);
    let response = requestETag
      ? await pagesCache.match(requestKey(request, requestETag))
      : undefined;

    console.log("hit", response !== undefined);
    if (!response) {
      // If not in cache, get it from origin
      const head = new Request(targetUrl, {
        method: "HEAD",
        headers: request.headers,
      });
      const fetchAndCache = fetch(targetUrl, request).then(cacheStale);
      response = await Promise.race([
        fetch(head).then(async (response) => {
          const responseETag = getETagFromResponse(response);
          // if does not have etag on header, then wait for the fetched response
          if (!responseETag) {
            return fetchAndCache;
          }
          // otherwise check if the response is cached and get the fastest response from either cached or fetched response.
          return await Promise.race([
            fetchAndCache,
            pagesCache.match(requestKey(request, responseETag)).then(
              (response) => {
                return response ?? fetchAndCache;
              },
            ),
          ]);
        }),
        fetchAndCache,
      ]);
    }

    return response;
  },
};
