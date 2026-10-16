"use client";

import * as React from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Campo de imagem com pré-visualização. Envia o arquivo em `name` e, se a imagem
 * atual for removida, `${name}Remove=1`. Validação final acontece no servidor.
 */
export function ImageInput({
  name,
  id,
  currentUrl,
  label = "Selecionar imagem",
  aspect = "aspect-video",
  invalid,
}: {
  name: string;
  id: string;
  currentUrl?: string | null;
  label?: string;
  aspect?: string;
  invalid?: boolean;
}) {
  const [preview, setPreview] = React.useState<string | null>(currentUrl ?? null);
  const [removed, setRemoved] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <div>
      <div
        className={cn(
          "relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-surface",
          aspect,
          invalid && "border-danger",
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Pré-visualização" className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs text-muted">
            <ImagePlus className="size-6" aria-hidden="true" />
            JPG, PNG, WEBP ou GIF · até 5 MB
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <label
          htmlFor={id}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-ink hover:bg-navy-50 focus-within:ring-2 focus-within:ring-spark-500"
        >
          <ImagePlus className="size-3.5" aria-hidden="true" /> {preview ? "Trocar imagem" : label}
          <input
            ref={inputRef}
            id={id}
            name={name}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setPreview(URL.createObjectURL(f));
                setRemoved(false);
              }
            }}
          />
        </label>
        {preview && (
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              setRemoved(true);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-danger hover:bg-danger-bg"
          >
            <Trash2 className="size-3.5" aria-hidden="true" /> Remover
          </button>
        )}
      </div>
      {removed && <input type="hidden" name={`${name}Remove`} value="1" />}
    </div>
  );
}
