import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDb } from "./helpers";
import { isLoginBlocked, recordLoginAttempt } from "@/server/auth/rate-limit";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("limite de tentativas de login", () => {
  it("bloqueia após 5 falhas para o mesmo e-mail", async () => {
    for (let i = 0; i < 4; i++) await recordLoginAttempt("a@teste.dev", "1.1.1.1", false);
    expect(await isLoginBlocked("a@teste.dev", "1.1.1.1")).toBe(false);
    await recordLoginAttempt("a@teste.dev", "1.1.1.1", false);
    expect(await isLoginBlocked("a@teste.dev", "1.1.1.1")).toBe(true);
    expect(await isLoginBlocked("b@teste.dev", "2.2.2.2")).toBe(false);
  });

  it("um login bem-sucedido zera a contagem do e-mail", async () => {
    for (let i = 0; i < 4; i++) await recordLoginAttempt("c@teste.dev", null, false);
    await recordLoginAttempt("c@teste.dev", null, true);
    await new Promise((r) => setTimeout(r, 5));
    await recordLoginAttempt("c@teste.dev", null, false);
    expect(await isLoginBlocked("c@teste.dev", null)).toBe(false);
  });

  it("bloqueia um IP após 20 falhas, mesmo com e-mails diferentes", async () => {
    for (let i = 0; i < 20; i++) await recordLoginAttempt(`x${i}@teste.dev`, "9.9.9.9", false);
    expect(await isLoginBlocked("novo@teste.dev", "9.9.9.9")).toBe(true);
  });
});
