import { serve } from "https://deno.land/std@0.146.0/http/server.ts";
import { createClient } from "supabase";
import { WeakLRUCache } from "https://deno.land/x/weakcache@v1.1.4/index.js";

const supabase = createClient(
  `https://${Deno.env.get("SUPABASE_ACCOUNT") as string}.supabase.co`,
  Deno.env.get("SUPABASE_KEY") as string,
);

// TODO
const domainCache = new WeakLRUCache();

const handler = async (req: Request) => {
  // Use the request pathname as filepath
  const url = new URL(req.url);
  const path = decodeURIComponent(url.pathname);

  console.log(url.hostname);

  let { data: Domains, error } = await supabase
    .from("Domains")
    .select(`
      name,
      site(
        name
      )`)
    .eq("name", url.hostname);

  const name = Domains![0].site.name;
  console.log(Domains![0].site.name);

  url.protocol = "https:";
  url.hostname = `${name}.decocache.com`;
  url.port = "443";

  // Route request to rendering service for this site
  return await fetch(url.href, {
    headers: req.headers,
    method: req.method,
    body: req.body,
  });

  // return new Response(JSON.stringify(Domains), {
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  // });
};
const port = parseInt(Deno.env.get("PORT") || "4201");

serve(handler, {
  port,
  onListen: () => console.log(`Listening on port ${port}`),
});
