import { describe, expect, it } from "vitest";
import {
  canViewUser,
  hasPermission,
  homePathFor,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  selfChangeError,
  userScopeFor,
} from "@/server/permissions/permissions";
import { ADMIN_NAV, COLABORADOR_NAV, filterNav } from "@/components/layout/nav-config";

describe("matriz de permissões", () => {
  it("administrador geral tem todas as permissões", () => {
    for (const p of PERMISSIONS) expect(hasPermission("ADMIN", p)).toBe(true);
  });

  it("colaborador só acessa o portal do colaborador", () => {
    expect(ROLE_PERMISSIONS.COLABORADOR).toEqual(["portal.access"]);
    expect(hasPermission("COLABORADOR", "admin.access")).toBe(false);
    expect(hasPermission("COLABORADOR", "grades.view")).toBe(false);
  });

  it("gestor não gerencia cadastro, cursos nem libera notas", () => {
    expect(hasPermission("GESTOR", "users.view")).toBe(true);
    expect(hasPermission("GESTOR", "users.manage")).toBe(false);
    expect(hasPermission("GESTOR", "courses.manage")).toBe(false);
    expect(hasPermission("GESTOR", "assessments.release")).toBe(false);
    expect(hasPermission("GESTOR", "retakes.authorize")).toBe(false);
  });

  it("instrutor corrige e libera, mas não gerencia pessoas nem configurações", () => {
    expect(hasPermission("INSTRUTOR", "assessments.grade")).toBe(true);
    expect(hasPermission("INSTRUTOR", "assessments.release")).toBe(true);
    expect(hasPermission("INSTRUTOR", "retakes.authorize")).toBe(true);
    expect(hasPermission("INSTRUTOR", "users.view")).toBe(false);
    expect(hasPermission("INSTRUTOR", "settings.manage")).toBe(false);
    expect(hasPermission("INSTRUTOR", "courses.manage")).toBe(false);
  });

  it("todos os perfis acessam o portal do colaborador", () => {
    for (const role of ["ADMIN", "GESTOR", "INSTRUTOR", "COLABORADOR"] as const) {
      expect(hasPermission(role, "portal.access")).toBe(true);
    }
  });
});

describe("escopo de visibilidade de pessoas", () => {
  const admin = { id: "a", role: "ADMIN" as const };
  const gestor = { id: "g", role: "GESTOR" as const, headedDepartmentIds: ["dep-comercial"] };
  const colab = { id: "c", role: "COLABORADOR" as const };

  it("define o escopo por perfil", () => {
    expect(userScopeFor(admin)).toEqual({ kind: "all" });
    expect(userScopeFor(gestor)).toEqual({ kind: "team", managerId: "g" });
    expect(userScopeFor(colab)).toEqual({ kind: "self", userId: "c" });
  });

  it("colaborador só vê a si mesmo", () => {
    expect(canViewUser(colab, { id: "c", managerId: null, departmentId: null })).toBe(true);
    expect(canViewUser(colab, { id: "x", managerId: "c", departmentId: null })).toBe(false);
  });

  it("gestor vê subordinados diretos e membros dos departamentos que chefia", () => {
    expect(canViewUser(gestor, { id: "x", managerId: "g", departmentId: null })).toBe(true);
    expect(canViewUser(gestor, { id: "y", managerId: "z", departmentId: "dep-comercial" })).toBe(true);
    expect(canViewUser(gestor, { id: "w", managerId: "z", departmentId: "dep-logistica" })).toBe(false);
  });

  it("administrador vê todos", () => {
    expect(canViewUser(admin, { id: "qualquer", managerId: null, departmentId: null })).toBe(true);
  });
});

describe("proteções contra autoalteração", () => {
  it("impede desativar o próprio acesso ou remover o próprio perfil de administrador", () => {
    expect(selfChangeError("a", "a", { status: "INACTIVE" })).toMatch(/próprio acesso/);
    expect(selfChangeError("a", "a", { role: "GESTOR" })).toMatch(/administrador/);
    expect(selfChangeError("a", "a", { role: "ADMIN" })).toBeNull();
    expect(selfChangeError("a", "b", { status: "INACTIVE", role: "COLABORADOR" })).toBeNull();
  });
});

describe("rotas e menus", () => {
  it("rota inicial por perfil", () => {
    expect(homePathFor("ADMIN")).toBe("/adm");
    expect(homePathFor("COLABORADOR")).toBe("/inicio");
  });

  it("menu ADM é filtrado pelas permissões do perfil", () => {
    const labels = (role: keyof typeof ROLE_PERMISSIONS) =>
      filterNav(ADMIN_NAV, ROLE_PERMISSIONS[role]).flatMap((g) => g.items.map((i) => i.href));
    expect(labels("COLABORADOR")).toEqual([]);
    expect(labels("GESTOR")).toContain("/adm/colaboradores");
    expect(labels("GESTOR")).not.toContain("/adm/configuracoes");
    expect(labels("INSTRUTOR")).toContain("/adm/avaliacoes");
    expect(labels("INSTRUTOR")).not.toContain("/adm/colaboradores");
    expect(labels("ADMIN")).toHaveLength(17);
  });

  it("menu do colaborador é o mesmo para todos os perfis", () => {
    const count = filterNav(COLABORADOR_NAV, ROLE_PERMISSIONS.COLABORADOR).flatMap((g) => g.items).length;
    expect(count).toBe(11);
  });
});
