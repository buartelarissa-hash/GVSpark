import { describe, expect, it } from "vitest";
import { generateTemporaryPassword, hashPassword, passwordPolicyError, verifyPassword } from "@/server/auth/password";
import { parseDateInput, tenure, toDateInput } from "@/lib/format";
import { firstName, initials, safeInternalPath } from "@/lib/utils";

describe("senhas", () => {
  it("aplica a política mínima", () => {
    expect(passwordPolicyError("curta1")).not.toBeNull();
    expect(passwordPolicyError("somenteletras")).not.toBeNull();
    expect(passwordPolicyError("12345678")).not.toBeNull();
    expect(passwordPolicyError("Valida123")).toBeNull();
  });

  it("gera senhas temporárias válidas e diferentes", () => {
    const a = generateTemporaryPassword();
    const b = generateTemporaryPassword();
    expect(passwordPolicyError(a)).toBeNull();
    expect(a).not.toEqual(b);
    expect(a).toHaveLength(12);
  });

  it("armazena apenas o hash e o verifica", async () => {
    const hash = await hashPassword("Segura123");
    expect(hash).not.toContain("Segura123");
    expect(await verifyPassword("Segura123", hash)).toBe(true);
    expect(await verifyPassword("Errada123", hash)).toBe(false);
  });
});

describe("redirecionamento seguro", () => {
  it("aceita apenas caminhos internos", () => {
    expect(safeInternalPath("/adm", "/inicio")).toBe("/adm");
    expect(safeInternalPath("//evil.com", "/inicio")).toBe("/inicio");
    expect(safeInternalPath("https://evil.com", "/inicio")).toBe("/inicio");
    expect(safeInternalPath("/\\evil.com", "/inicio")).toBe("/inicio");
    expect(safeInternalPath(undefined, "/inicio")).toBe("/inicio");
  });
});

describe("formatação", () => {
  const now = new Date(Date.UTC(2026, 9, 16));
  it("calcula o tempo de empresa", () => {
    expect(tenure(new Date(Date.UTC(2026, 9, 1)), now)).toBe("Menos de 1 mês");
    expect(tenure(new Date(Date.UTC(2026, 8, 16)), now)).toBe("1 mês");
    expect(tenure(new Date(Date.UTC(2025, 9, 16)), now)).toBe("1 ano");
    expect(tenure(new Date(Date.UTC(2023, 6, 10)), now)).toBe("3 anos e 3 meses");
    expect(tenure(null, now)).toBe("—");
  });

  it("converte datas de formulário sem deslocamento de fuso", () => {
    const d = parseDateInput("2025-08-04");
    expect(d?.toISOString()).toBe("2025-08-04T00:00:00.000Z");
    expect(toDateInput(d)).toBe("2025-08-04");
    expect(parseDateInput("04/08/2025")).toBeNull();
  });

  it("extrai nome e iniciais", () => {
    expect(firstName("João da Silva")).toBe("João");
    expect(initials("João da Silva")).toBe("JS");
    expect(initials("Maria")).toBe("M");
  });
});
