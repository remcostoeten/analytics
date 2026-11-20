import { isAiCrawler } from "@spoar/shared/crawlers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
  if (isAiCrawler(request.headers.get("user-agent"))) {
    return new NextResponse(null, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  // Skips Next build output, image optimisation and files with a static asset extension.
  matcher:
    "/((?!_next/static|_next/image|.*\\.(?:ico|png|jpe?g|gif|webp|avif|svg|woff2?|ttf|otf|css|js|map)$).*)",
};
