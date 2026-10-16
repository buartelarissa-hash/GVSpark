import Link from "next/link";
import { FileText, PenSquare } from "lucide-react";
import { requireAnyPagePermission } from "@/server/auth/current-user";
import { manageableCoursesWhere } from "@/server/services/courses";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Editor de aulas" };

export default async function LessonsIndexPage() {
  const actor = await requireAnyPagePermission(["courses.manage", "courses.manageOwn"]);
  const lessons = await db.lesson.findMany({
    where: { module: { course: manageableCoursesWhere(actor) } },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: { module: { select: { title: true, course: { select: { id: true, title: true } } } }, _count: { select: { blocks: true } } },
  });
  return (
    <>
      <PageHeader
        title="Editor de aulas"
        description="Aulas editadas recentemente. Para criar uma aula, abra o curso em “Cursos e treinamentos” e use “Nova aula” no módulo."
      />
      <Card>
        {lessons.length ? (
          <Table>
            <THead>
              <tr>
                <TH>Aula</TH>
                <TH className="hidden md:table-cell">Curso / módulo</TH>
                <TH className="text-right">Blocos</TH>
                <TH>Status</TH>
                <TH className="hidden lg:table-cell">Atualizada</TH>
              </tr>
            </THead>
            <TBody>
              {lessons.map((l) => (
                <TR key={l.id}>
                  <TD>
                    <Link href={`/adm/aulas/${l.id}`} className="flex items-center gap-2 font-semibold hover:text-navy-700">
                      <FileText className="size-4 text-navy-600" aria-hidden="true" /> {l.title}
                    </Link>
                  </TD>
                  <TD className="hidden text-muted md:table-cell">
                    <Link href={`/adm/cursos/${l.module.course.id}`} className="hover:underline">{l.module.course.title}</Link> · {l.module.title}
                  </TD>
                  <TD className="text-right tabular-nums">{l._count.blocks}</TD>
                  <TD>{l.published ? <Badge tone="success">Publicada</Badge> : <Badge>Rascunho</Badge>}</TD>
                  <TD className="hidden text-muted lg:table-cell">{formatDateTime(l.updatedAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState icon={PenSquare} title="Nenhuma aula ainda" description="Crie um curso e adicione módulos e aulas." />
        )}
      </Card>
    </>
  );
}
