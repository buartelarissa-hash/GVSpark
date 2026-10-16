"use client";

import * as React from "react";
import { CheckCircle2, FileUp, Loader2, Paperclip, X } from "lucide-react";
import { acceptAttr, formatBytes, type FileKind } from "@/lib/file-validation";
import { cn } from "@/lib/utils";
import { finalizeUploadAction, startUploadAction, type UploadedFile } from "@/app/actions/uploads";

type Target = { type: "course"; courseId: string } | { type: "brand" };

/**
 * Envio de arquivos grandes (vídeos, PDFs, apresentações) com barra de progresso.
 * O arquivo vai direto para o armazenamento (S3/R2 por URL assinada, ou rota local),
 * e o servidor confere tamanho e conteúdo antes de liberar o uso.
 * O id do arquivo pronto fica no campo oculto `name`.
 */
export function FileUpload({
  name,
  id,
  kinds,
  target,
  initial,
  invalid,
  onUploaded,
}: {
  name: string;
  id: string;
  kinds: FileKind[];
  target: Target;
  initial?: UploadedFile | null;
  invalid?: boolean;
  onUploaded?: (f: UploadedFile | null) => void;
}) {
  const [file, setFile] = React.useState<UploadedFile | null>(initial ?? null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const xhrRef = React.useRef<XMLHttpRequest | null>(null);

  const choose = async (f: File) => {
    setError(null);
    setProgress(0);
    const start = await startUploadAction({ fileName: f.name, size: f.size, target, kinds });
    if (!start.ok) {
      setProgress(null);
      setError(start.error);
      return;
    }
    const ticket = start.data;
    const okPut = await new Promise<boolean>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open(ticket.method, ticket.url);
      Object.entries(ticket.headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
      xhr.onerror = () => resolve(false);
      xhr.onabort = () => resolve(false);
      xhr.send(f);
    });
    xhrRef.current = null;
    if (!okPut) {
      setProgress(null);
      setError("O envio foi interrompido. Verifique a conexão e tente novamente.");
      return;
    }
    const done = await finalizeUploadAction(ticket.fileId);
    setProgress(null);
    if (!done.ok) {
      setError(done.error);
      return;
    }
    setFile(done.data);
    onUploaded?.(done.data);
  };

  const uploading = progress !== null;
  return (
    <div>
      <input type="hidden" name={name} value={file?.id ?? ""} />
      {file && !uploading ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
          <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted">{formatBytes(file.size)}</p>
          </div>
          <label htmlFor={id} className="cursor-pointer rounded-md px-2 py-1 text-xs font-semibold text-navy-700 hover:bg-white">
            Trocar
          </label>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-surface px-4 py-6 text-center transition-colors hover:border-navy-600",
            invalid && "border-danger",
            uploading && "pointer-events-none",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="size-6 animate-spin text-navy-600" aria-hidden="true" />
              <span className="text-sm font-semibold">Enviando... {progress}%</span>
              <span className="mt-1 h-1.5 w-48 overflow-hidden rounded-full bg-navy-100">
                <span className="block h-full bg-spark-500 transition-[width]" style={{ width: `${progress}%` }} />
              </span>
            </>
          ) : (
            <>
              <FileUp className="size-6 text-navy-600" aria-hidden="true" />
              <span className="text-sm font-semibold text-ink">Clique para escolher o arquivo</span>
              <span className="text-xs text-muted">{acceptAttr(kinds).replaceAll(",", " ")}</span>
            </>
          )}
        </label>
      )}
      <input
        id={id}
        type="file"
        accept={acceptAttr(kinds)}
        className="sr-only"
        disabled={uploading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void choose(f);
        }}
      />
      {uploading && (
        <button
          type="button"
          onClick={() => xhrRef.current?.abort()}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-danger hover:underline"
        >
          <X className="size-3.5" /> Cancelar envio
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs font-medium text-danger">
          <Paperclip className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}
