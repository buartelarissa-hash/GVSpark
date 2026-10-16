"use client";

import * as React from "react";
import Link from "next/link";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, FileText, GripVertical, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Textarea } from "@/components/ui/input";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  addLessonAction,
  deleteLessonAction,
  deleteModuleAction,
  duplicateLessonAction,
  reorderStructureAction,
  saveModuleAction,
} from "../actions";

export type LessonItem = { id: string; title: string; published: boolean; blocks: number; minutes: number | null };
export type ModuleItem = { id: string; title: string; description: string | null; lessons: LessonItem[] };

const M = (id: string) => `m:${id}`;
const L = (id: string) => `l:${id}`;
const raw = (id: string | number) => String(id).slice(String(id).indexOf(":") + 1);
/** Alvo é um módulo (o cabeçalho ordenável ou a área de soltar vazia). */
const isModuleTarget = (id: string) => id.startsWith("m:") || id.startsWith("drop:");

export function StructureEditor({ courseId, initial }: { courseId: string; initial: ModuleItem[] }) {
  const [modules, setModules] = React.useState(initial);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const snapshot = React.useRef<ModuleItem[]>(initial);

  // Dados novos do servidor (após criar/excluir) substituem o estado local.
  React.useEffect(() => {
    setModules(initial);
    snapshot.current = initial;
  }, [initial]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const moduleOfLesson = (lessonId: string, list = modules) => list.find((m) => m.lessons.some((l) => l.id === lessonId));

  const persist = async (next: ModuleItem[]) => {
    setSaving(true);
    const res = await reorderStructureAction(
      courseId,
      next.map((m) => ({ moduleId: m.id, lessonIds: m.lessons.map((l) => l.id) })),
    );
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Não foi possível salvar a nova ordem.");
      setModules(snapshot.current);
    } else {
      setError(null);
      snapshot.current = next;
    }
  };

  const onDragStart = (e: DragStartEvent) => {
    snapshot.current = modules;
    setActiveId(String(e.active.id));
  };

  // Move a aula para outro módulo enquanto arrasta.
  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over || !String(active.id).startsWith("l:")) return;
    const lessonId = raw(active.id);
    const overId = String(over.id);
    const from = moduleOfLesson(lessonId);
    const to = isModuleTarget(overId) ? modules.find((m) => m.id === raw(overId)) : moduleOfLesson(raw(overId));
    if (!from || !to || from.id === to.id) return;
    setModules((prev) => {
      const lesson = from.lessons.find((l) => l.id === lessonId)!;
      return prev.map((m) => {
        if (m.id === from.id) return { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) };
        if (m.id === to.id) {
          const idx = overId.startsWith("l:") ? m.lessons.findIndex((l) => l.id === raw(overId)) : m.lessons.length;
          const lessons = [...m.lessons];
          lessons.splice(idx < 0 ? lessons.length : idx, 0, lesson);
          return { ...m, lessons };
        }
        return m;
      });
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) {
      setModules(snapshot.current);
      return;
    }
    const a = String(active.id);
    const o = String(over.id);
    let next = modules;
    if (a.startsWith("m:")) {
      const target = isModuleTarget(o) ? raw(o) : moduleOfLesson(raw(o))?.id;
      const oldIdx = modules.findIndex((m) => m.id === raw(a));
      const newIdx = modules.findIndex((m) => m.id === target);
      if (newIdx >= 0 && oldIdx !== newIdx) next = arrayMove(modules, oldIdx, newIdx);
    } else if (o.startsWith("l:")) {
      const mod = moduleOfLesson(raw(a));
      if (mod) {
        const oldIdx = mod.lessons.findIndex((l) => l.id === raw(a));
        const newIdx = mod.lessons.findIndex((l) => l.id === raw(o));
        if (newIdx >= 0 && oldIdx !== newIdx) {
          next = modules.map((m) => (m.id === mod.id ? { ...m, lessons: arrayMove(m.lessons, oldIdx, newIdx) } : m));
        }
      }
    }
    setModules(next);
    const changed = JSON.stringify(next.map((m) => [m.id, m.lessons.map((l) => l.id)])) !==
      JSON.stringify(snapshot.current.map((m) => [m.id, m.lessons.map((l) => l.id)]));
    if (changed) void persist(next);
  };

  const activeLesson = activeId?.startsWith("l:") ? modules.flatMap((m) => m.lessons).find((l) => l.id === raw(activeId)) : null;
  const activeModule = activeId?.startsWith("m:") ? modules.find((m) => m.id === raw(activeId)) : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Arraste <GripVertical className="inline size-4" aria-hidden="true" /> para reordenar módulos e aulas (também é possível mover aulas entre módulos).
          Pelo teclado: foque a alça, pressione Espaço, use as setas e Espaço de novo.
        </p>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-muted" role="status">Salvando ordem...</span>}
          <ModuleDialog courseId={courseId} />
        </div>
      </div>
      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}

      {modules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white">
          <EmptyState icon={Layers} title="Nenhum módulo ainda" description="Comece criando o primeiro módulo, por exemplo “Conhecendo a marca”." action={<ModuleDialog courseId={courseId} />} />
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => { setActiveId(null); setModules(snapshot.current); }}>
          <SortableContext items={modules.map((m) => M(m.id))} strategy={verticalListSortingStrategy}>
            <ol className="space-y-4">
              {modules.map((m, i) => (
                <SortableModule key={m.id} courseId={courseId} module={m} index={i} />
              ))}
            </ol>
          </SortableContext>
          <DragOverlay>
            {activeLesson ? <LessonRow lesson={activeLesson} overlay /> : activeModule ? (
              <div className="rounded-xl border-2 border-spark-500 bg-white px-4 py-3 font-semibold shadow-lg">{activeModule.title}</div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function SortableModule({ courseId, module: m, index }: { courseId: string; module: ModuleItem; index: number }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: M(m.id) });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `drop:${m.id}`, data: { moduleId: m.id } });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn("rounded-xl border border-border bg-white shadow-[var(--shadow-card)]", isDragging && "opacity-40")}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-3">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="cursor-grab rounded p-1.5 text-muted hover:bg-navy-50 hover:text-ink active:cursor-grabbing"
          aria-label={`Mover módulo ${m.title}`}
        >
          <GripVertical className="size-4" />
        </button>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-navy-900">{m.title}</p>
          {m.description && <p className="truncate text-xs text-muted">{m.description}</p>}
        </div>
        <span className="hidden text-xs text-muted sm:block">{m.lessons.length} {m.lessons.length === 1 ? "aula" : "aulas"}</span>
        <ModuleDialog courseId={courseId} module={m} />
        <ConfirmAction
          trigger={<Trash2 />}
          triggerLabel={`Excluir módulo ${m.title}`}
          triggerVariant="ghost"
          title={`Excluir o módulo "${m.title}"?`}
          description="O módulo e todas as suas aulas serão excluídos. Se alguma aula já foi estudada, a exclusão é bloqueada para preservar o histórico."
          confirmLabel="Excluir"
          action={deleteModuleAction}
          hidden={{ id: m.id, courseId }}
        />
      </div>
      <SortableContext items={m.lessons.map((l) => L(l.id))} strategy={verticalListSortingStrategy}>
        <ul ref={setDropRef} className={cn("min-h-12 space-y-1.5 p-3", isOver && "bg-spark-50")}>
          {m.lessons.map((l) => (
            <SortableLesson key={l.id} lesson={l} courseId={courseId} />
          ))}
          {m.lessons.length === 0 && <li className="px-2 py-2 text-xs text-muted">Nenhuma aula. Arraste uma aula para cá ou crie uma nova.</li>}
        </ul>
      </SortableContext>
      <div className="border-t border-border px-3 py-2">
        <LessonDialog courseId={courseId} moduleId={m.id} />
      </div>
    </li>
  );
}

function SortableLesson({ lesson, courseId }: { lesson: LessonItem; courseId: string }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: L(lesson.id) });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn(isDragging && "opacity-40")}>
      <LessonRow
        lesson={lesson}
        handle={
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="cursor-grab rounded p-1 text-muted hover:bg-white hover:text-ink active:cursor-grabbing"
            aria-label={`Mover aula ${lesson.title}`}
          >
            <GripVertical className="size-4" />
          </button>
        }
        actions={
          <>
            <form action={duplicateLessonAction}>
              <input type="hidden" name="id" value={lesson.id} />
              <input type="hidden" name="courseId" value={courseId} />
              <Button type="submit" variant="ghost" size="icon" aria-label={`Duplicar ${lesson.title}`} title="Duplicar">
                <Copy />
              </Button>
            </form>
            <ConfirmAction
              trigger={<Trash2 />}
              triggerLabel={`Excluir aula ${lesson.title}`}
              triggerVariant="ghost"
              title={`Excluir a aula "${lesson.title}"?`}
              description="A aula e seus blocos serão excluídos. Se ela já foi estudada, a exclusão é bloqueada — despublique-a."
              confirmLabel="Excluir"
              action={deleteLessonAction}
              hidden={{ id: lesson.id, courseId }}
            />
          </>
        }
      />
    </li>
  );
}

function LessonRow({ lesson, handle, actions, overlay }: { lesson: LessonItem; handle?: React.ReactNode; actions?: React.ReactNode; overlay?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-2 py-1.5", overlay && "border-spark-500 bg-white shadow-lg")}>
      {handle ?? <GripVertical className="size-4 text-muted" aria-hidden="true" />}
      <FileText className="size-4 shrink-0 text-navy-600" aria-hidden="true" />
      <Link href={`/adm/aulas/${lesson.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-navy-700 hover:underline">
        {lesson.title}
      </Link>
      <span className="hidden text-xs text-muted sm:inline">{lesson.blocks} {lesson.blocks === 1 ? "bloco" : "blocos"}</span>
      {lesson.published ? <Badge tone="success">Publicada</Badge> : <Badge>Rascunho</Badge>}
      {actions}
      {!overlay && (
        <Button asChild variant="ghost" size="icon" aria-label={`Editar ${lesson.title}`}>
          <Link href={`/adm/aulas/${lesson.id}`}>
            <Pencil />
          </Link>
        </Button>
      )}
    </div>
  );
}

function ModuleDialog({ courseId, module: m }: { courseId: string; module?: ModuleItem }) {
  return (
    <FormDialog
      title={m ? "Editar módulo" : "Novo módulo"}
      action={saveModuleAction}
      trigger={
        m ? (
          <Button variant="ghost" size="icon" aria-label={`Editar módulo ${m.title}`}>
            <Pencil />
          </Button>
        ) : (
          <Button size="sm">
            <Plus /> Novo módulo
          </Button>
        )
      }
    >
      {(e) => (
        <>
          <input type="hidden" name="courseId" value={courseId} />
          {m && <input type="hidden" name="moduleId" value={m.id} />}
          <Field label="Título do módulo" htmlFor="mod-title" error={e.title} required>
            <Input id="mod-title" name="title" defaultValue={m?.title} maxLength={150} required placeholder="Ex.: Conhecendo a marca" aria-invalid={!!e.title} />
          </Field>
          <Field label="Descrição (opcional)" htmlFor="mod-desc" error={e.description}>
            <Textarea id="mod-desc" name="description" defaultValue={m?.description ?? ""} maxLength={500} rows={3} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}

function LessonDialog({ courseId, moduleId }: { courseId: string; moduleId: string }) {
  return (
    <FormDialog
      title="Nova aula"
      description="Depois de criar, você monta o conteúdo no editor de aulas."
      action={addLessonAction}
      submitLabel="Criar e abrir editor"
      trigger={
        <Button variant="ghost" size="sm">
          <Plus /> Nova aula
        </Button>
      }
    >
      {(e) => (
        <>
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="moduleId" value={moduleId} />
          <Field label="Título da aula" htmlFor="les-title" error={e.title} required>
            <Input id="les-title" name="title" maxLength={150} required aria-invalid={!!e.title} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}
