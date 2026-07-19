import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export function GET(request: NextRequest) {
	const response = NextResponse.redirect(new URL("/", request.url));
	response.cookies.delete(SESSION_COOKIE);
	return response;
}
