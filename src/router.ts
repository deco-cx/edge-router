import {
  cacheStaleFor,
  ddUrl,
  getETagFromRequest,
  getETagFromResponse,
  isBrowserRequestingPages,
  requestKey,
} from "./commons.ts";

const cache = caches.default;
const CACHE_TIME_MAX_SECONDS = 15;
const CACHE_TIME_MIN_SECONDS = 10;

// Export a default object containing event handlers
export default {
  async fetch(
    request: Request,
    _env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const targetUrl = ddUrl(request);

    if (!isBrowserRequestingPages(request)) {
      const cachedResponse = await cache.match(request);
      return cachedResponse ?? fetch(targetUrl, request).then((response) => {
        const copiedResponse = new Response(response.body, response);
        ctx.waitUntil(cache.put(request, copiedResponse.clone()));
        return copiedResponse;
      });
    }
    const timeSecondsTtl = CACHE_TIME_MIN_SECONDS +
      (Math.floor(Math.random() * CACHE_TIME_MAX_SECONDS));

    const cacheStale = cacheStaleFor(
      request,
      timeSecondsTtl,
      cache,
      ctx,
    );

    const requestETag = getETagFromRequest(request);
    let response = requestETag
      ? await cache.match(requestKey(request, requestETag, timeSecondsTtl))
      : undefined;
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
            cache.match(requestKey(request, responseETag, timeSecondsTtl)).then(
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
