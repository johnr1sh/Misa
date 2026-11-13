import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "misa_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return value;
}

function signature(expiresAt: string) {
  return createHmac("sha256", secret()).update(expiresAt).digest("base64url");
}

export function createSessionToken() {
  const expiresAt = String(Date.now() + SESSION_SECONDS * 1000);
  return `${expiresAt}.${signature(expiresAt)}`;
}

export function isValidSession(token?: string) {
  if (!token) return false;
  const [expiresAt, supplied, extra] = token.split(".");
  if (!expiresAt || !supplied || extra || !/^\\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= Date.now()) return false;
  try {
    const expected = Buffer.from(signature(expiresAt));
    const actual = Buffer.from(supplied);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function hasSession() {
  const jar = await cookies();
  return isValidSession(jar.get(SESSION_COOKIE)?.value);
}

export function passwordMatches(candidate: string) {
  const configured = process.env.APP_PASSWORD;
  if (!configured) return false;
  const left = Buffer.from(candidate);
  const right = Buffer.from(configured);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const SESSION_MAX_AGE = SESSION_SECONDS;