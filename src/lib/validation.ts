import { z } from "zod";

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional()).transform((v) => v ?? null);

export const optionalId = z
  .preprocess(emptyToNull, z.string().cuid().nullable().optional())
  .transform((v) => v ?? null);

export const optionalDate = z
  .preprocess(emptyToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida").nullable().optional())
  .transform((v) => v ?? null);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(200),
  password: z.string().min(1, "Informe a senha.").max(128),
  next: z.string().max(300).optional(),
});

export const userFormSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo.").max(120),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(200),
  role: z.enum(["ADMIN", "GESTOR", "INSTRUTOR", "COLABORADOR"]),
  registration: optionalText(40),
  phone: optionalText(30),
  admissionDate: optionalDate,
  departmentId: optionalId,
  positionId: optionalId,
  managerId: optionalId,
});
export type UserFormInput = z.infer<typeof userFormSchema>;

export const departmentFormSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do departamento.").max(80),
  description: optionalText(500),
  parentId: optionalId,
  headId: optionalId,
});

export const positionFormSchema = z.object({
  title: z.string().trim().min(2, "Informe o nome do cargo.").max(80),
  description: optionalText(500),
  departmentId: optionalId,
});

/** Converte FormData em objeto simples (último valor vence). */
export function formToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

/** Primeira mensagem de erro por campo. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Dado exibido uma única vez (ex.: senha temporária). */
  secret?: string;
  /** Identificador do registro criado, quando aplicável. */
  id?: string;
};
