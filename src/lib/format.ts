const dateFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function formatDate(d: Date | null | undefined): string {
  return d ? dateFmt.format(d) : "—";
}

export function formatDateTime(d: Date | null | undefined): string {
  return d ? dateTimeFmt.format(d) : "—";
}

/**
 * Tempo de empresa em texto ("2 anos e 3 meses", "5 meses", "Menos de 1 mês").
 * `admission` é uma data (sem hora); a comparação usa UTC.
 */
export function tenure(admission: Date | null | undefined, now: Date = new Date()): string {
  if (!admission) return "—";
  let months =
    (now.getUTCFullYear() - admission.getUTCFullYear()) * 12 + (now.getUTCMonth() - admission.getUTCMonth());
  if (now.getUTCDate() < admission.getUTCDate()) months -= 1;
  if (months < 1) return "Menos de 1 mês";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = years > 0 ? `${years} ${years === 1 ? "ano" : "anos"}` : "";
  const m = rest > 0 ? `${rest} ${rest === 1 ? "mês" : "meses"}` : "";
  return [y, m].filter(Boolean).join(" e ");
}

/** Converte "AAAA-MM-DD" em Date UTC (ou null). */
export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toDateInput(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "";
}
