import "server-only";
import { db } from "@/server/db";

const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;

/** Bloqueia novas tentativas após falhas consecutivas recentes (por e-mail e por IP). */
export async function isLoginBlocked(email: string, ip: string | null): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const lastSuccess = await db.loginAttempt.findFirst({
    where: { email, success: true, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const emailFailures = await db.loginAttempt.count({
    where: { email, success: false, createdAt: { gte: lastSuccess?.createdAt ?? since } },
  });
  if (emailFailures >= MAX_FAILURES_PER_EMAIL) return true;
  if (ip) {
    const ipFailures = await db.loginAttempt.count({ where: { ip, success: false, createdAt: { gte: since } } });
    if (ipFailures >= MAX_FAILURES_PER_IP) return true;
  }
  return false;
}

export async function recordLoginAttempt(email: string, ip: string | null, success: boolean) {
  await db.loginAttempt.create({ data: { email, ip, success } });
}
