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
  matcher: ["/dashboard", "/dashboard/:path*"],
};
