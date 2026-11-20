import { isAiCrawler } from "@spoar/shared/crawlers";
import { isMarkdownPreferred } from "fumadocs-core/negotiation";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/docs")) {
    return isMarkdownPreferred(request)
      ? NextResponse.rewrite(new URL(`/llms.mdx${pathname.replace(/\/+$/, "")}`, request.url))
      : NextResponse.next();
  }
  if (isAiCrawler(request.headers.get("user-agent"))) {
    return new NextResponse(null, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    // Every dashboard path except Next build output, image optimisation and static asset files.
    "/dashboard/((?!_next/static|_next/image|.*\\.(?:ico|png|jpe?g|gif|webp|avif|svg|woff2?|ttf|otf|css|js|map)$).*)",
    "/docs",
    "/docs/:path*",
  ],
};
