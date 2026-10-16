/**
 * O React 19 chama `form.reset()` ao terminar um envio com `action` — inclusive
 * quando o servidor recusa os dados, o que faria o usuário perder o que digitou.
 * O reset acontece durante o commit do React, quando eventos sintéticos (onReset)
 * não são disparados; por isso usamos um listener nativo.
 *
 * Uso: <form ref={keepFormValues} action={...}>
 */
export function keepFormValues(form: HTMLFormElement | null) {
  if (form && !form.dataset.keepValues) {
    form.dataset.keepValues = "1";
    form.addEventListener("reset", (e) => e.preventDefault());
  }
}
