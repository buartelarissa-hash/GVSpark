import "server-only";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, open, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Armazenamento de arquivos.
 *
 * - "local" (desenvolvimento): pasta STORAGE_LOCAL_DIR, fora de /public. Uploads
 *   grandes chegam por PUT em /api/uploads/[token] e são gravados em streaming.
 * - "s3" (produção): qualquer serviço compatível com S3 — Cloudflare R2, AWS S3,
 *   Supabase Storage, MinIO. O bucket deve ser PRIVADO. Uploads vão direto do
 *   navegador para o bucket por URL assinada (necessário para vídeos grandes em
 *   hospedagens como Netlify/Vercel) e downloads usam URL assinada de curta duração.
 *
 * Em ambos os casos o acesso passa sempre por /api/arquivos/[id], que verifica
 * login e permissão antes de entregar (ou assinar) o arquivo.
 */
export interface StorageDriver {
  readonly kind: "local" | "s3";
  put(key: string, data: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  /** Tamanho em bytes, ou null se não existir. */
  size(key: string): Promise<number | null>;
  /** Primeiros `length` bytes (para validar o conteúdo). */
  head(key: string, length: number): Promise<Uint8Array>;
  remove(key: string): Promise<void>;
}

export interface LocalStorageDriver extends StorageDriver {
  readonly kind: "local";
  /** Grava um stream, abortando se ultrapassar `maxBytes`. Retorna o total gravado. */
  writeStream(key: string, body: ReadableStream<Uint8Array>, maxBytes: number): Promise<number>;
  /** Stream de leitura (com intervalo opcional, para vídeo). */
  readStream(key: string, range?: { start: number; end: number }): ReadableStream<Uint8Array>;
}

export interface S3StorageDriver extends StorageDriver {
  readonly kind: "s3";
  presignPut(key: string, contentType: string, expiresSeconds: number): Promise<string>;
  presignGet(key: string, opts: { fileName: string; contentType: string; inline: boolean; expiresSeconds: number }): Promise<string>;
}

const KEY_RE = /^[a-z0-9][a-z0-9/_.-]{0,200}$/;

export function assertValidKey(key: string) {
  if (!KEY_RE.test(key) || key.includes("..")) throw new Error("Chave de arquivo inválida.");
}

export class FileTooLargeError extends Error {
  constructor() {
    super("O arquivo excede o tamanho informado.");
  }
}

function localDriver(): LocalStorageDriver {
  const root = path.resolve(process.env.STORAGE_LOCAL_DIR || "./storage");
  const resolve = (key: string) => {
    assertValidKey(key);
    const full = path.resolve(root, key);
    if (!full.startsWith(root + path.sep)) throw new Error("Chave de arquivo inválida.");
    return full;
  };
  return {
    kind: "local",
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
    async size(key) {
      try {
        return (await stat(resolve(key))).size;
      } catch {
        return null;
      }
    },
    async head(key, length) {
      const fh = await open(resolve(key), "r");
      try {
        const buf = Buffer.alloc(length);
        const { bytesRead } = await fh.read(buf, 0, length, 0);
        return new Uint8Array(buf.subarray(0, bytesRead));
      } finally {
        await fh.close();
      }
    },
    async remove(key) {
      await rm(resolve(key), { force: true });
    },
    async writeStream(key, body, maxBytes) {
      const full = resolve(key);
      await mkdir(path.dirname(full), { recursive: true });
      let total = 0;
      const limiter = new Transform({
        transform(chunk: Buffer, _enc, cb) {
          total += chunk.length;
          if (total > maxBytes) cb(new FileTooLargeError());
          else cb(null, chunk);
        },
      });
      try {
        await pipeline(Readable.fromWeb(body as import("node:stream/web").ReadableStream), limiter, createWriteStream(full, { flags: "w" }));
      } catch (e) {
        await rm(full, { force: true });
        throw e;
      }
      return total;
    },
    readStream(key, range) {
      const stream = createReadStream(resolve(key), range ? { start: range.start, end: range.end } : undefined);
      return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
    },
  };
}

function s3Driver(): S3StorageDriver {
  const bucket = process.env.S3_BUCKET;
  if (!bucket || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
    throw new Error("Configure S3_BUCKET, S3_ACCESS_KEY_ID e S3_SECRET_ACCESS_KEY para usar STORAGE_DRIVER=s3.");
  }
  const client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
  });
  return {
    kind: "s3",
    async put(key, data, contentType) {
      assertValidKey(key);
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: contentType }));
    },
    async get(key) {
      assertValidKey(key);
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return res.Body ? await res.Body.transformToByteArray() : null;
      } catch {
        return null;
      }
    },
    async size(key) {
      assertValidKey(key);
      try {
        const res = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return res.ContentLength ?? null;
      } catch {
        return null;
      }
    },
    async head(key, length) {
      assertValidKey(key);
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: `bytes=0-${length - 1}` }));
      return res.Body ? await res.Body.transformToByteArray() : new Uint8Array();
    },
    async remove(key) {
      assertValidKey(key);
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
    async presignPut(key, contentType, expiresSeconds) {
      assertValidKey(key);
      return getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), {
        expiresIn: expiresSeconds,
      });
    },
    async presignGet(key, { fileName, contentType, inline, expiresSeconds }) {
      assertValidKey(key);
      const disposition = `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(fileName)}`;
      return getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentDisposition: disposition, ResponseContentType: contentType }),
        { expiresIn: expiresSeconds },
      );
    },
  };
}

let driver: StorageDriver | null = null;

export function storage(): StorageDriver {
  if (driver) return driver;
  const kind = process.env.STORAGE_DRIVER || "local";
  if (kind === "local") driver = localDriver();
  else if (kind === "s3") driver = s3Driver();
  else throw new Error(`Driver de armazenamento desconhecido: "${kind}". Use "local" ou "s3".`);
  return driver;
}
