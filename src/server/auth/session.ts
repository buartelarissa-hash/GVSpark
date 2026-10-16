import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/server/db";

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || "gvspark_session";
const TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 12);

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return { ip: forwarded || h.get("x-real-ip") || null, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_HOURS * 3600_000);
  const meta = await requestMeta();
  await db.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt, ip: meta.ip, userAgent: meta.userAgent },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function readSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function destroyCurrentSession(): Promise<void> {
  const token = await readSessionToken();
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function destroyUserSessions(userId: string, exceptTokenHash?: string): Promise<void> {
  await db.session.deleteMany({
    where: { userId, ...(exceptTokenHash ? { NOT: { tokenHash: exceptTokenHash } } : {}) },
  });
}
