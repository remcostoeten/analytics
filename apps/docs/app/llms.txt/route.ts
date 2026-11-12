import { renderIndex } from "@/lib/llms";

export function GET() {
  return new Response(renderIndex(), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
