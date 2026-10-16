"use client";

import * as React from "react";
import type { LessonBlockType } from "@prisma/client";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Copy,
  ExternalLink,
  FileText,
  FileUp,
  GripVertical,
  Image as ImageIcon,
  ListChecks,
  Paperclip,
  Pencil,
  Plus,
  Presentation,
  Trash2,
  Type,
  Video,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { BLOCK_LABEL, BLOCK_TYPES } from "@/lib/lesson-blocks";
import { cn } from "@/lib/utils";
import { deleteBlockAction, duplicateBlockAction, reorderBlocksAction } from "../actions";
import { BlockEditorDialog, type EditableBlock } from "./block-editor";

export const BLOCK_ICONS: Record<LessonBlockType, LucideIcon> = {
  RICH_TEXT: Type,
  IMAGE: ImageIcon,
  VIDEO_UPLOAD: Video,
  VIDEO_EMBED: Youtube,
  PDF: FileText,
  PRESENTATION: Presentation,
  LINK: ExternalLink,
  ACTIVITY: ListChecks,
  ATTACHMENT: Paperclip,
};

export function BlocksList({
  lessonId,
  courseId,
  blocks: initial,
  previews,
}: {
  lessonId: string;
  courseId: string;
  blocks: EditableBlock[];
  /** Pré-visualização de cada bloco, renderizada no servidor. */
  previews: Record<string, React.ReactNode>;
}) {
  const [blocks, setBlocks] = React.useState(initial);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<{ type: LessonBlockType; block?: EditableBlock } | null>(null);
  const [picker, setPicker] = React.useState(false);
  React.useEffect(() => setBlocks(initial), [initial]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const before = blocks;
    const next = arrayMove(blocks, blocks.findIndex((b) => b.id === active.id), blocks.findIndex((b) => b.id === over.id));
    setBlocks(next);
    const res = await reorderBlocksAction(lessonId, next.map((b) => b.id));
    if (!res.ok) {
      setBlocks(before);
      setError(res.error ?? "Não foi possível salvar a nova ordem.");
    } else setError(null);
  };

  return (
    <div>
      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
      {blocks.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border bg-white px-6 py-10 text-center">
          <FileUp className="mx-auto size-8 text-navy-600" aria-hidden="true" />
          <p className="mt-2 font-semibold">Esta aula ainda está vazia</p>
          <p className="text-sm text-muted">Combine blocos de texto, imagens, vídeos, PDFs, links e atividades.</p>
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-4">
            {blocks.map((b, i) => (
              <SortableBlock key={b.id} block={b} index={i} lessonId={lessonId} preview={previews[b.id]} onEdit={() => setEditing({ type: b.type, block: b })} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      <div className="mt-6">
        {picker ? (
          <div className="rounded-xl border border-border bg-white p-4 shadow-[var(--shadow-card)]">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-navy-900">Escolha o tipo de bloco</p>
              <Button variant="ghost" size="sm" onClick={() => setPicker(false)}>Fechar</Button>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {BLOCK_TYPES.map((t) => {
                const Icon = BLOCK_ICONS[t.type];
                return (
                  <li key={t.type}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicker(false);
                        setEditing({ type: t.type });
                      }}
                      className="flex h-full w-full items-start gap-3 rounded-lg border border-border p-3 text-left transition hover:border-spark-500 hover:bg-spark-50"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{t.label}</span>
                        <span className="block text-xs text-muted">{t.description}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <Button onClick={() => setPicker(true)} className="w-full sm:w-auto">
            <Plus /> Adicionar bloco
          </Button>
        )}
      </div>

      {editing && (
        <BlockEditorDialog
          key={editing.block?.id ?? `new-${editing.type}`}
          lessonId={lessonId}
          courseId={courseId}
          type={editing.type}
          block={editing.block}
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
        />
      )}
    </div>
  );
}

function SortableBlock({
  block,
  index,
  lessonId,
  preview,
  onEdit,
}: {
  block: EditableBlock;
  index: number;
  lessonId: string;
  preview: React.ReactNode;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const Icon = BLOCK_ICONS[block.type];
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("rounded-xl border border-border bg-white shadow-[var(--shadow-card)]", isDragging && "z-10 opacity-60 ring-2 ring-spark-500")}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="cursor-grab rounded p-1.5 text-muted hover:bg-navy-50 hover:text-ink active:cursor-grabbing"
          aria-label={`Mover bloco ${index + 1}`}
        >
          <GripVertical className="size-4" />
        </button>
        <Icon className="size-4 text-navy-600" aria-hidden="true" />
        <span className="flex-1 text-sm font-semibold">
          {index + 1}. {BLOCK_LABEL[block.type]}
        </span>
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Editar bloco ${index + 1}`}>
          <Pencil />
        </Button>
        <form action={duplicateBlockAction}>
          <input type="hidden" name="id" value={block.id} />
          <input type="hidden" name="lessonId" value={lessonId} />
          <Button type="submit" variant="ghost" size="icon" aria-label={`Duplicar bloco ${index + 1}`} title="Duplicar">
            <Copy />
          </Button>
        </form>
        <ConfirmAction
          trigger={<Trash2 />}
          triggerLabel={`Excluir bloco ${index + 1}`}
          triggerVariant="ghost"
          title="Excluir este bloco?"
          description="O bloco será removido da aula. Essa ação não pode ser desfeita."
          confirmLabel="Excluir"
          action={deleteBlockAction}
          hidden={{ id: block.id, lessonId }}
        />
      </div>
      <div className="max-h-[28rem] overflow-hidden p-5 [mask-image:linear-gradient(to_bottom,black_85%,transparent)]">{preview}</div>
    </li>
  );
}
