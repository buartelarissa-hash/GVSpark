import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Armazenamento de arquivos.
 *
 * - "local" (padrão em desenvolvimento): pasta STORAGE_LOCAL_DIR, fora de /public —
 *   os arquivos só saem pela rota autenticada /api/arquivos/[id].
 * - "s3" (produção, compatível com Cloudflare R2 / AWS S3 / Supabase): previsto para a
 *   Fase 3, com upload direto do navegador por URL assinada (necessário para vídeos).
 */
export interface StorageDriver {
  put(key: string, data: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  remove(key: string): Promise<void>;
}

const KEY_RE = /^[a-z0-9][a-z0-9/_.-]{0,200}$/;

function localDriver(): StorageDriver {
  const root = path.resolve(process.env.STORAGE_LOCAL_DIR || "./storage");
  const resolve = (key: string) => {
    if (!KEY_RE.test(key) || key.includes("..")) throw new Error("Chave de arquivo inválida.");
    const full = path.resolve(root, key);
    if (!full.startsWith(root + path.sep)) throw new Error("Chave de arquivo inválida.");
    return full;
  };
  return {
    async put(key, data) {
      const full = resolve(key);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, data, { flag: "wx" });
    },
    async get(key) {
      try {
        return new Uint8Array(await readFile(resolve(key)));
      } catch {
        return null;
      }
    },
    async remove(key) {
      await rm(resolve(key), { force: true });
    },
  };
}

let driver: StorageDriver | null = null;

export function storage(): StorageDriver {
  if (driver) return driver;
  const kind = process.env.STORAGE_DRIVER || "local";
  if (kind !== "local") throw new Error(`Driver de armazenamento "${kind}" ainda não disponível (previsto para a Fase 3).`);
  driver = localDriver();
  return driver;
}
