import crypto from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "xqueue_session";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function expectedSessionValue(): string {
  const secret = env("APP_SECRET");
  const password = env("APP_PASSWORD");
  return crypto.createHmac("sha256", secret).update(password).digest("hex");
}

export function verifyPassword(input: string): boolean {
  const expected = Buffer.from(env("APP_PASSWORD"));
  const actual = Buffer.from(input);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const store = await cookies();
    const value = store.get(SESSION_COOKIE)?.value;
    if (!value) return false;
    const expected = expectedSessionValue();
    const a = Buffer.from(value);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
