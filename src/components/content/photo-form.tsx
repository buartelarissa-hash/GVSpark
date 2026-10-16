"use client";

import { useActionState } from "react";
import { ImageInput } from "./image-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { updatePhotoAction } from "@/app/actions/photo";
import { keepFormValues } from "@/lib/forms";

export function PhotoForm({ userId, currentUrl }: { userId: string; currentUrl: string | null }) {
  const [state, action] = useActionState(updatePhotoAction, {});
  return (
    <form ref={keepFormValues} action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <div className="mx-auto w-40">
        <ImageInput id={`photo-${userId}`} name="photo" currentUrl={currentUrl} aspect="aspect-square" label="Escolher foto" invalid={!!state.errors?.photo} />
      </div>
      {state.message && (
        <p role={state.ok ? "status" : "alert"} className={`text-center text-xs font-medium ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </p>
      )}
      <div className="flex justify-center">
        <SubmitButton size="sm" variant="navy" pendingText="Enviando...">Salvar foto</SubmitButton>
      </div>
    </form>
  );
}
