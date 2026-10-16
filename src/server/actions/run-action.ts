import "server-only";
import { AuthorizationError } from "@/server/auth/current-user";
import { ServiceError } from "@/server/services/errors";
import type { ActionState } from "@/lib/validation";

/** Executa uma server action convertendo erros conhecidos em mensagens ao usuário. */
export async function runAction(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AuthorizationError) return { message: e.message };
    if (e instanceof ServiceError) return e.field ? { message: e.message, errors: { [e.field]: e.message } } : { message: e.message };
    console.error(e);
    return { message: "Não foi possível concluir a operação. Tente novamente." };
  }
}
