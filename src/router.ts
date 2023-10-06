import {
  cacheStaleFor,
  ddUrl,
  getETag,
  isBrowserRequestingPages,
} from "./commons.ts";

const cache = caches.default;
const CACHE_TIME_MAX_SECONDS = 4;
const CACHE_TIME_MIN_SECONDS = 1;

// Export a default object containing event handlers
export default {
  async fetch(
    request: Request,
    _env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    console.log("req received", request.url);
    const targetUrl = ddUrl(request);
    console.log("target url", targetUrl);

    if (!isBrowserRequestingPages(request)) {
      return fetch(targetUrl, request);
    }

    const cacheStale = cacheStaleFor(
      CACHE_TIME_MIN_SECONDS +
        (Math.floor(Math.random() * CACHE_TIME_MAX_SECONDS)),
      cache,
      ctx,
    );

    const requestETag = getETag(request);
    let response = requestETag ? await cache.match(requestETag) : undefined;
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
          const responseETag = getETag(response);
          // if does not have etag on header, then wait for the fetched response
          if (!responseETag) {
            return fetchAndCache;
          }
          // otherwise check if the response is cached and get the fastest response from either cached or fetched response.
          return await Promise.race([
            fetchAndCache,
            cache.match(responseETag).then((response) => {
              return response ?? fetchAndCache;
            }),
          ]);
        }),
        fetchAndCache,
      ]);
    }

    return response;
  },
};
