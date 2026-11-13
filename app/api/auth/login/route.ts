import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, passwordMatches, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!process.env.APP_PASSWORD || !process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    return NextResponse.json({ error: "Authentication is not configured on the server." }, { status: 503 });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  let password = "";
  try {
    const body = await request.json();
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!password || password.length > 512 || !passwordMatches(password)) {
    return NextResponse.json({ error: "That password is not correct." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "strict", path: "/", maxAge: SESSION_MAX_AGE,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}