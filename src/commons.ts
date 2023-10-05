import cookie from "cookie";

const DECO_ETAG_COOKIE = "deco_etag";

/**
 * @returns the cache key of the given request
 */
export const getETag = (req: Request | Response): string | undefined => {
  const cookies = cookie.parse(req.headers.get("cookie") || "");
  return cookies[DECO_ETAG_COOKIE];
};

const DECO_DOMAIN_PREFIX = "deco-sites";

/**
 * @param req the target request
 * @returns the domain of the deno deploy host
 */
export const ddUrl = (req: Request) => {
  const url = new URL(req.url);
  const [siteName] = url.hostname.split(".");
  const newHost = `${DECO_DOMAIN_PREFIX}-${siteName}.deno.dev`;
  url.host = newHost;

  return url.toString();
};

/**
 * @param req the upcoming request
 * @returns if is from browser
 */
export const isBrowserRequestingPages = (req: Request): boolean => {
  return req.method === "GET" && req.headers?.get("accept")?.includes("html") &&
      req.headers.get("user-agent") !== null || false;
};

export const cacheStaleFor =
  (timeMs: number, cache: typeof caches["default"], ctx: ExecutionContext) =>
  (response: Response) => {
    // Any changes made to the response here will be reflected in the cached value
    const etag = getETag(response);
    if (etag) {
      const cachedResponse = new Response(response.body, response);
      cachedResponse.headers.append("Cache-Control", `s-maxage=${timeMs}`);
      ctx.waitUntil(cache.put(etag, cachedResponse.clone()));
      return cachedResponse;
    }
    return response;
  };
