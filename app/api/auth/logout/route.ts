import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "strict", path: "/", maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}