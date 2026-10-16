import "server-only";
import { db } from "@/server/db";

/** Opções para os formulários de curso. */
export async function courseFormOptions() {
  const [categories, brands, instructors] = await Promise.all([
    db.courseCategory.findMany({ where: { active: true }, orderBy: [{ order: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.brand.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.user.findMany({
      where: { status: "ACTIVE", role: { in: ["ADMIN", "INSTRUTOR"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return {
    categories: categories.map((c) => ({ id: c.id, label: c.name })),
    brands: brands.map((b) => ({ id: b.id, label: b.name })),
    instructors: instructors.map((i) => ({ id: i.id, label: i.name })),
  };
}
