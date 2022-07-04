import { serve } from "https://deno.land/std@0.146.0/http/server.ts";
import { createClient } from "supabase";

const supabase = createClient(
  `https://${Deno.env.get("SUPABASE_ACCOUNT") as string}.supabase.co`,
  Deno.env.get("SUPABASE_KEY") as string,
);

const handler = async (req: Request) => {
  // Use the request pathname as filepath
  const url = new URL(req.url);
  const filepath = decodeURIComponent(url.pathname.replace("/1", ""));

  // Try opening the file
  let file;
  try {
    file = await Deno.open("." + filepath, { read: true });
  } catch {
    // If the file cannot be opened, return a "404 Not Found" response
    return new Response("404 Not Found", { status: 404 });
  }

  // Build a readable stream so the file doesn't have to be fully loaded into
  // memory while we send it
  const readableStream = file.readable;

  // Return the file as a response
  return new Response(readableStream);
};
const port = parseInt(Deno.env.get("PORT") || "4201");

serve(handler, {
  port,
  onListen: () => console.log(`Listening on port ${port}`),
});
