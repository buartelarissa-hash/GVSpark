import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Hash fixo usado quando o e-mail não existe, para que o tempo de resposta não
// revele quais e-mails estão cadastrados.
const DUMMY_HASH = "$2b$12$Sgyn86EYhUqd0x4W8woGxu7QZR5XjHDK2HXUX7eyz0mcb48ZB9pQ6";
export async function burnPasswordCheck(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_HASH);
}

/**
 * Política mínima: 8+ caracteres, ao menos uma letra e um número.
 * Retorna mensagem de erro ou null.
 */
export function passwordPolicyError(pwd: string): string | null {
  if (pwd.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (pwd.length > 128) return "A senha deve ter no máximo 128 caracteres.";
  if (!/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) return "A senha deve conter letras e números.";
  return null;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
/** Senha temporária legível (sem caracteres ambíguos), sempre com letra e número. */
export function generateTemporaryPassword(length = 12): string {
  for (;;) {
    let out = "";
    for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
    if (passwordPolicyError(out) === null) return out;
  }
}
