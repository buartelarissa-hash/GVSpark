"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, ROLES } from "@/lib/roles";
import type { ActionState } from "@/lib/validation";

type Options = {
  departments: { id: string; name: string }[];
  positions: { id: string; title: string; departmentId: string | null; department: { name: string } | null }[];
  managers: { id: string; name: string }[];
};

export type UserFormDefaults = {
  id?: string;
  name?: string;
  username?: string;
  email?: string | null;
  role?: string;
  registration?: string | null;
  phone?: string | null;
  admissionDate?: string;
  departmentId?: string | null;
  positionId?: string | null;
  managerId?: string | null;
};

export function UserForm({
  action,
  options,
  defaults = {},
  submitLabel,
  onReset,
  canEditRole = true,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  options: Options;
  defaults?: UserFormDefaults;
  submitLabel: string;
  /** Reinicia o formulário após um cadastro bem-sucedido. */
  onReset?: () => void;
  /** Somente o administrador geral define o perfil de acesso. */
  canEditRole?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const [departmentId, setDepartmentId] = React.useState(defaults.departmentId ?? "");
  const e = state.errors ?? {};
  const isCreate = !defaults.id;

  const positions = options.positions.filter((p) => !departmentId || !p.departmentId || p.departmentId === departmentId);
  const managers = options.managers.filter((m) => m.id !== defaults.id);

  if (isCreate && state.ok) {
    return (
      <div className="space-y-5">
        <Alert tone="success" title={state.message} />
        <div className="rounded-lg border border-dashed border-navy-600 bg-navy-50 p-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Senha temporária</p>
          <p className="mt-1 select-all font-mono text-2xl font-bold tracking-wider text-navy-900">{state.secret}</p>
          <p className="mt-2 text-xs text-muted">
            Repasse o usuário e esta senha ao colaborador por um canal seguro. Ela não será exibida novamente e deverá ser trocada no primeiro acesso.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {state.id && (
            <Button asChild variant="navy">
              <Link href={`/adm/colaboradores/${state.id}`}>Ver cadastro</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <button type="button" onClick={onReset}>Cadastrar outro</button>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      {state.message && <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>}

      <section aria-labelledby="sec-pessoais" className="grid gap-5 sm:grid-cols-2">
        <h2 id="sec-pessoais" className="text-sm font-semibold text-navy-900 sm:col-span-2">Dados pessoais</h2>
        <Field label="Nome completo" htmlFor="name" error={e.name} required className="sm:col-span-2">
          <Input id="name" name="name" defaultValue={defaults.name} required maxLength={120} aria-invalid={!!e.name} />
        </Field>
        <Field
          label="Usuário de acesso"
          htmlFor="username"
          error={e.username}
          required
          hint="Usado para entrar no GV SPARK. Ex.: joao.silva (sem espaços e sem acentos)."
        >
          <Input
            id="username"
            name="username"
            defaultValue={defaults.username}
            required
            maxLength={30}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={!!e.username}
          />
        </Field>
        <Field label="E-mail (opcional)" htmlFor="email" error={e.email}>
          <Input id="email" name="email" type="email" defaultValue={defaults.email ?? ""} aria-invalid={!!e.email} />
        </Field>
        <Field label="Telefone" htmlFor="phone" error={e.phone}>
          <Input id="phone" name="phone" defaultValue={defaults.phone ?? ""} maxLength={30} />
        </Field>
        <Field label="Matrícula" htmlFor="registration" error={e.registration}>
          <Input id="registration" name="registration" defaultValue={defaults.registration ?? ""} maxLength={40} aria-invalid={!!e.registration} />
        </Field>
        <Field label="Data de admissão" htmlFor="admissionDate" error={e.admissionDate}>
          <Input id="admissionDate" name="admissionDate" type="date" defaultValue={defaults.admissionDate ?? ""} />
        </Field>
      </section>

      <section aria-labelledby="sec-posicao" className="grid gap-5 border-t border-border pt-6 sm:grid-cols-2">
        <h2 id="sec-posicao" className="text-sm font-semibold text-navy-900 sm:col-span-2">Posição na empresa</h2>
        <Field label="Departamento" htmlFor="departmentId" error={e.departmentId}>
          <Select
            id="departmentId"
            name="departmentId"
            value={departmentId}
            onChange={(ev) => setDepartmentId(ev.target.value)}
          >
            <option value="">Não definido</option>
            {options.departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Cargo" htmlFor="positionId" error={e.positionId}>
          <Select id="positionId" name="positionId" defaultValue={defaults.positionId ?? ""} key={departmentId} aria-invalid={!!e.positionId}>
            <option value="">Não definido</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
                {!departmentId && p.department ? ` (${p.department.name})` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Gestor responsável" htmlFor="managerId" error={e.managerId}>
          <Select id="managerId" name="managerId" defaultValue={defaults.managerId ?? ""} aria-invalid={!!e.managerId}>
            <option value="">Não definido</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </Field>
        <Field
          label="Perfil de acesso"
          htmlFor="role"
          error={e.role}
          required
          hint={canEditRole ? "Define o que a pessoa pode ver e fazer na plataforma." : "Somente o administrador geral altera o perfil de acesso."}
        >
          {!canEditRole && <input type="hidden" name="role" value={defaults.role} />}
          <Select id="role" name={canEditRole ? "role" : undefined} defaultValue={defaults.role ?? "COLABORADOR"} disabled={!canEditRole}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </Select>
        </Field>
      </section>

      <div className="flex flex-wrap gap-2 border-t border-border pt-6">
        <SubmitButton pendingText="Salvando...">{submitLabel}</SubmitButton>
        <Button asChild variant="outline">
          <Link href="/adm/colaboradores">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}

/** Formulário de cadastro que pode ser reiniciado para um novo registro. */
export function NewUserForm(props: Omit<React.ComponentProps<typeof UserForm>, "onReset" | "defaults">) {
  const [round, setRound] = React.useState(0);
  return <UserForm key={round} {...props} onReset={() => setRound((r) => r + 1)} />;
}
