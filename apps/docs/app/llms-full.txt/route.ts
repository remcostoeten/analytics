import { renderFull } from "@/lib/llms";

export async function GET() {
  return new Response(await renderFull(), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
