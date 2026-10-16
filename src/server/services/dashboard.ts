import "server-only";
import { db } from "@/server/db";
import type { CurrentUser } from "@/server/auth/current-user";
import { visibleUsersWhere } from "./users";
import { getUserOnboarding } from "./onboarding";

function currentPeriod(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Dados do dashboard do colaborador — sempre restritos ao próprio usuário. */
export async function getCollaboratorDashboard(user: CurrentUser) {
  const now = new Date();

  const [onboarding, inProgress, mandatoryPending, recommended, badges, announcements, indicators, manager] =
    await Promise.all([
      getUserOnboarding(user),
      db.enrollment.findMany({
        where: { userId: user.id, status: "IN_PROGRESS", course: { status: "PUBLISHED" } },
        orderBy: { startedAt: "desc" },
        take: 4,
        select: { id: true, course: { select: { id: true, title: true, slug: true } } },
      }),
      db.enrollment.findMany({
        where: {
          userId: user.id,
          status: { not: "COMPLETED" },
          course: { status: "PUBLISHED", OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
          AND: [{ OR: [{ mandatory: true }, { course: { mandatory: true } }] }],
        },
        orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }],
        take: 4,
        select: { id: true, dueDate: true, course: { select: { title: true, slug: true } } },
      }),
      db.course.findMany({
        where: {
          status: "PUBLISHED",
          restricted: false,
          OR: [{ publishAt: null }, { publishAt: { lte: now } }],
          enrollments: { none: { userId: user.id } },
        },
        orderBy: { publishAt: "desc" },
        take: 3,
        select: { id: true, title: true, slug: true, durationMinutes: true, category: { select: { name: true } } },
      }),
      db.userBadge.findMany({
        where: { userId: user.id },
        orderBy: { awardedAt: "desc" },
        take: 4,
        select: { id: true, awardedAt: true, badge: { select: { name: true, icon: true } } },
      }),
      db.announcement.findMany({
        where: {
          publishedAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
        take: 3,
        select: { id: true, title: true, body: true, publishedAt: true, pinned: true, isDemo: true },
      }),
      db.indicatorResult.findMany({
        where: { userId: user.id, period: currentPeriod(now) },
        select: { id: true, target: true, actual: true, indicator: { select: { name: true, unit: true } } },
      }),
      user.managerId ? db.user.findUnique({ where: { id: user.managerId }, select: { name: true } }) : null,
    ]);

  return {
    onboarding: onboarding
      ? { total: onboarding.total, completed: onboarding.doneCount, percent: onboarding.percent, finished: onboarding.completed }
      : null,
    inProgress,
    mandatoryPending,
    recommended,
    badges,
    announcements,
    indicators: indicators.map((i) => ({
      id: i.id,
      name: i.indicator.name,
      unit: i.indicator.unit,
      target: Number(i.target),
      actual: i.actual === null ? null : Number(i.actual),
    })),
    managerName: manager?.name ?? null,
  };
}

/** Indicadores do dashboard administrativo (escopo de pessoas respeita o perfil). */
export async function getAdminDashboard(actor: CurrentUser) {
  const people = visibleUsersWhere(actor);
  const [
    activeUsers,
    departments,
    publishedCourses,
    enrollmentsInProgress,
    enrollmentsCompleted,
    enrollmentsTotal,
    awaitingGrading,
    awaitingRelease,
    pendingInquiries,
    recentUsers,
  ] = await Promise.all([
    db.user.count({ where: { AND: [people, { status: "ACTIVE" }] } }),
    db.department.count({ where: { active: true } }),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.enrollment.count({ where: { status: "IN_PROGRESS", user: people } }),
    db.enrollment.count({ where: { status: "COMPLETED", user: people } }),
    db.enrollment.count({ where: { user: people } }),
    db.assessmentAttempt.count({ where: { status: "SUBMITTED", user: people } }),
    db.assessmentAttempt.count({ where: { status: "GRADED", user: people } }),
    db.inquiry.count({ where: { status: { in: ["RECEIVED", "IN_ANALYSIS"] } } }),
    db.user.findMany({
      where: people,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        isDemo: true,
        position: { select: { title: true } },
        department: { select: { name: true } },
      },
    }),
  ]);

  // "Novas tentativas aguardando autorização": última tentativa liberada e reprovada,
  // sem autorização de nova tentativa pendente.
  const failedReleased = await db.assessmentAttempt.findMany({
    where: { status: "RELEASED", passed: false, user: people },
    select: { assessmentId: true, userId: true, attemptNumber: true },
  });
  const latest = new Map<string, number>();
  const allAttempts = await db.assessmentAttempt.findMany({
    where: { userId: { in: [...new Set(failedReleased.map((a) => a.userId))] } },
    select: { assessmentId: true, userId: true, attemptNumber: true },
  });
  for (const a of allAttempts) {
    const k = `${a.assessmentId}:${a.userId}`;
    latest.set(k, Math.max(latest.get(k) ?? 0, a.attemptNumber));
  }
  const openRetakes = await db.retakeAuthorization.findMany({
    where: { consumedAttemptId: null, revokedAt: null },
    select: { assessmentId: true, userId: true },
  });
  const hasOpen = new Set(openRetakes.map((r) => `${r.assessmentId}:${r.userId}`));
  const retakesPending = failedReleased.filter((a) => {
    const k = `${a.assessmentId}:${a.userId}`;
    return latest.get(k) === a.attemptNumber && !hasOpen.has(k);
  }).length;

  return {
    activeUsers,
    departments,
    publishedCourses,
    enrollmentsInProgress,
    enrollmentsCompleted,
    completionRate: enrollmentsTotal ? Math.round((enrollmentsCompleted / enrollmentsTotal) * 100) : null,
    awaitingGrading,
    awaitingRelease,
    retakesPending,
    pendingInquiries,
    recentUsers,
  };
}
