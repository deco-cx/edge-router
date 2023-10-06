import cookie from "cookie";

const DECO_ETAG_COOKIE = "deco_etag";

/**
 * @returns the cache key of the given request
 */
export const getETagFromRequest = (req: Request): string | undefined => {
  const cookies = cookie.parse(req.headers.get("cookie") || "");
  return cookies[DECO_ETAG_COOKIE];
};

/**
 * @returns the cache key of the given request
 */
export const getETagFromResponse = (req: Response): string | undefined => {
  const cookies = cookie.parse(req.headers.get("set-cookie") || "");
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

export const cacheStaleFor = (
  req: Request,
  timeMs: number,
  cache: typeof caches["default"],
  ctx: ExecutionContext,
) =>
(response: Response) => {
  // Any changes made to the response here will be reflected in the cached value
  const etag = getETagFromResponse(response);
  if (etag) {
    const cachedResponse = new Response(response.body, response);
    cachedResponse.headers.append("Cache-Control", `s-maxage=${timeMs}`);
    ctx.waitUntil(cache.put(requestKey(req, etag), cachedResponse.clone()));
    return cachedResponse;
  }
  return response;
};

export const requestKey = (req: Request, cacheKey: string) => {
  return new Request(req, { cf: { cacheKey } });
};
