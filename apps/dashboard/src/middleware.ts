import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DASHBOARD_USERNAME = process.env.DASHBOARD_USERNAME || "admin";
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || "";

export function middleware(request: NextRequest) {
  if (!DASHBOARD_PASSWORD) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Analytics Dashboard"',
      },
    });
  }

  const [scheme, encoded] = authHeader.split(" ");

  if (scheme !== "Basic") {
    return new NextResponse("Invalid authentication scheme", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Analytics Dashboard"',
      },
    });
  }

  const buffer = Buffer.from(encoded, "base64");
  const decoded = buffer.toString("utf-8");
  const [username, password] = decoded.split(":");

  if (username === DASHBOARD_USERNAME && password === DASHBOARD_PASSWORD) {
    return NextResponse.next();
  }

  return new NextResponse("Invalid credentials", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Analytics Dashboard"',
    },
  });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)",
  ],
};
