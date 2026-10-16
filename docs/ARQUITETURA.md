# GV SPARK — Arquitetura e plano de desenvolvimento

## 1. Análise do repositório

O repositório estava vazio (sem commits nem código). Não havia estrutura a preservar, então a base foi criada do zero com a stack sugerida.

## 2. Stack

| Camada | Escolha | Observação |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) + React 19 + TypeScript | Server Components, Server Actions |
| Estilo | Tailwind CSS 4, componentes próprios no padrão shadcn/ui (Radix + CVA) | Tokens de marca em `src/app/globals.css` |
| Ícones | Lucide | Sem emojis |
| Fonte | Inter (self-hosted via `@fontsource-variable/inter`) | Sem dependência do Google Fonts no build |
| Banco | PostgreSQL 16 + Prisma 6 | Migrations versionadas em `prisma/migrations` |
| Autenticação | Própria: senha com bcrypt (custo 12) + sessão em banco | Token aleatório de 256 bits no cookie `httpOnly`; só o hash SHA-256 fica no banco |
| Validação | Zod | Toda entrada de formulário é validada no servidor |
| Testes | Vitest (unitário + integração com banco de teste) | |
| Previstos | TipTap (Fase 3), armazenamento S3-compatível com driver local (Fase 3), Recharts (Fase 4), geração de PDF (Fase 4) | Nenhum serviço pago |

**Por que autenticação própria e não Auth.js?** O login é só por e-mail/senha corporativos, sem provedores externos. Sessões em banco permitem revogar acesso na hora (desativação, troca de papel, reset de senha), o que a regra de permissões exige. Se a empresa adotar SSO (Microsoft/Google) no futuro, dá para adicionar um provedor OIDC sem mudar o modelo de sessão.

## 3. Estrutura de pastas

```
prisma/
  schema.prisma          Modelo completo (Fases 1 a 6)
  migrations/            Migrations versionadas
  seed.ts                Dados DEMONSTRATIVOS (somente desenvolvimento)
src/
  middleware.ts          Barreira inicial: sem cookie → /login (a validação real é no servidor)
  app/
    login/, alterar-senha/, acesso-negado/
    (portal)/            Portal do Colaborador (layout com menu lateral)
      inicio/ perfil/ integracao/ nossa-historia/ organograma/
      academy/ academy/marcas/ duvidas/ historico/ certificados/ jornada/ metas/
    adm/                 Portal Administrativo (GV SPARK ADM)
      colaboradores/ departamentos/ configuracoes/ ... (17 itens de menu)
    actions/             Server actions compartilhadas (logout)
    api/health/          Verificação de saúde (banco)
  components/
    ui/                  Componentes reutilizáveis (Button, Input, Card, Dialog, Table...)
    layout/              Shell dos portais, configuração de menus
    brand/               Logotipo provisório
  lib/                   Utilitários puros (formatação, validação Zod, rótulos)
  server/                Código exclusivo do servidor ("server-only")
    db.ts                Prisma Client
    auth/                Senhas, sessão, usuário atual, limite de tentativas
    permissions/         Matriz de permissões (módulo puro, testado)
    services/            Regras de negócio e acesso a dados (users, organization, dashboard, audit)
    actions/             Utilitário de tratamento de erros de server actions
tests/
  unit/                  Regras puras
  integration/           Serviços contra banco PostgreSQL de teste
docs/
```

Separação de responsabilidades: **páginas e componentes** só apresentam; **server actions** fazem autenticação/autorização e validação de entrada; **services** contêm as regras de negócio e o acesso a dados; **permissions** é puro e testável.

## 4. Segurança e permissões

- Perfis: `ADMIN` (administrador geral), `GESTOR`, `INSTRUTOR`, `COLABORADOR`.
- A matriz de permissões fica em `src/server/permissions/permissions.ts` e é aplicada **no servidor**:
  - Layouts e páginas: `requireUser()`, `requirePagePermission()`.
  - Server actions: `assertPermission()`, que lança erro e impede a execução.
  - Consultas: `visibleUsersWhere()` restringe os dados no próprio SQL. O gestor só enxerga a si mesmo, os subordinados diretos e os membros dos departamentos que chefia; o colaborador só enxerga a si mesmo. Trocar o ID na URL não dá acesso a outro registro (o resultado é 404).
- Sessão: expiração absoluta (12 h por padrão), revogada ao desativar o usuário, ao mudar o papel e ao gerar senha temporária.
- Login: mensagem genérica (não revela se o e-mail existe ou se a conta está inativa), tempo de resposta equalizado, bloqueio após 5 falhas por e-mail ou 20 por IP em 15 minutos.
- Senhas: mínimo de 8 caracteres com letras e números; senhas temporárias exigem troca no primeiro acesso.
- `?next=` só aceita caminhos internos (sem open redirect); um colaborador nunca é redirecionado para `/adm`.
- Auditoria: tabela `AuditLog` (quem, o quê, quando, IP) para login/logout, cadastro, alterações e status.
- Cabeçalhos de segurança (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`).
- Previsto para as próximas fases: histórico imutável de notas (`ScoreAdjustment`), uploads com validação de tipo/tamanho servidos por rota autenticada, política de retenção configurável (`Setting`) e rotina de backup (`pg_dump`) documentada.

## 5. Modelo de dados (visão geral)

O schema completo já está em `prisma/schema.prisma` e validado por migration, para checar a arquitetura de ponta a ponta. As fases seguintes podem refiná-lo.

| Domínio | Modelos |
| --- | --- |
| Acesso e estrutura (F1) | `User`, `Session`, `LoginAttempt`, `Department`, `Position`, `AuditLog`, `Setting` |
| Integração (F2) | `CompanySection`, `TimelineEvent`, `OrgPosition` (posições podem ficar vagas), `Announcement`, `OnboardingTrack`, `OnboardingStep`, `OnboardingProgress` |
| Academy (F3) | `CourseCategory`, `Brand`, `Course`, `CourseModule`, `Lesson`, `LessonBlock` (blocos tipados com conteúdo JSON), `FileAsset`, `CourseAssignment` (todos/departamento/cargo/pessoa), `LearningPath`, `Enrollment`, `LessonProgress` |
| Avaliações (F4) | `Question`, `QuestionOption` (com `matchKey` reservado para associação), `Assessment`, `AssessmentQuestion`, `AssessmentAttempt`, `AttemptAnswer`, `ScoreAdjustment`, `RetakeAuthorization`, `Certificate` |
| Desenvolvimento (F5) | `CareerEvent`, `Feedback` (`visibleToUser`), `Competency`, `UserCompetency`, `DevelopmentPlan`, `DevelopmentGoal`, `Indicator`, `IndicatorResult`, `BadgeCategory`, `Badge`, `UserBadge`, `Inquiry`, `InquiryMessage`, `Faq` |

### Regra obrigatória de notas (modelada para a Fase 4)

- `AssessmentAttempt.status`: `IN_PROGRESS → SUBMITTED → GRADED → RELEASED`. A API do colaborador só devolve nota, aprovação e gabarito quando o status é `RELEASED`; antes disso, a resposta é "Avaliação enviada com sucesso. Aguardando análise."
- Cada tentativa é um registro novo (`@@unique([assessmentId, userId, attemptNumber])`). Nada é sobrescrito, e as relações usam `onDelete: Restrict` para impedir exclusão em cascata.
- `snapshot` congela as questões, a ordem e a pontuação apresentadas em cada tentativa.
- `RetakeAuthorization` é independente da liberação da nota. Uma nova tentativa só pode ser criada se existir uma autorização não consumida e não revogada, consumida atomicamente (`consumedAttemptId @unique`).
- `ScoreAdjustment` registra valor anterior, valor novo, justificativa e autor de toda alteração de nota.

## 6. Telas e rotas

### Portal do Colaborador
| Rota | Tela | Fase |
| --- | --- | --- |
| `/login`, `/alterar-senha` | Login e troca obrigatória de senha | 1 ✅ |
| `/inicio` | Dashboard personalizado | 1 ✅ (os blocos se preenchem conforme as fases) |
| `/perfil` | Meu perfil e alteração de senha | 1 ✅ |
| `/integracao` | Jornada de integração com progresso | 2 |
| `/nossa-historia` | História, linha do tempo, missão, visão, valores, vídeo | 2 |
| `/organograma` | Organograma interativo | 2 |
| `/academy`, `/academy/cursos/[slug]`, `/academy/aulas/[id]` | Biblioteca, curso, visualizador de aula | 3 |
| `/academy/marcas`, `/academy/marcas/[slug]` | Marcas parceiras | 3 |
| `/academy/avaliacoes/[id]` | Realização de prova | 4 |
| `/historico` | Meu histórico acadêmico | 4 |
| `/certificados`, `/certificados/[codigo]` | Certificados e PDF | 4 |
| `/jornada` | Minha jornada / PDI | 5 |
| `/metas` | Metas e conquistas | 5 |
| `/duvidas` | Central de dúvidas e FAQ | 5 |

### Portal ADM (`/adm`)
| Rota | Tela | Fase |
| --- | --- | --- |
| `/adm` | Dashboard administrativo | 1 ✅ |
| `/adm/colaboradores`, `/novo`, `/[id]` | Lista com busca/filtros/paginação, cadastro, edição, senha temporária, desativação | 1 ✅ |
| `/adm/departamentos` | Departamentos e cargos (criar, editar, arquivar) | 1 ✅ |
| `/adm/configuracoes` | Matriz de permissões, identidade visual, auditoria | 1 ✅ |
| `/adm/historia`, `/adm/organograma` | Conteúdo institucional e organograma | 2 |
| `/adm/cursos`, `/adm/aulas`, `/adm/marcas` | Academy Builder | 3 |
| `/adm/questoes`, `/adm/avaliacoes`, `/adm/notas`, `/adm/certificados` | Avaliações, correção, liberação, novas tentativas | 4 |
| `/adm/jornada`, `/adm/metas`, `/adm/duvidas` | Desenvolvimento | 5 |
| `/adm/relatorios` | Relatórios e exportações | 6 |

As rotas das fases futuras já existem, protegidas pela permissão correta, e mostram claramente "Em desenvolvimento · Fase N".

## 7. Plano por fases

1. **Fundação** ✅: estrutura, identidade visual, login, banco, perfis e permissões, layout dos dois portais, gestão de colaboradores, departamentos e cargos, auditoria.
2. **Integração**: editor de história e cultura (TipTap), linha do tempo, organograma interativo com posições vagas, trilha de integração por cargo, comunicados.
3. **Academy**: categorias, marcas, Academy Builder (curso → módulos → aulas → blocos com arrastar e soltar), upload seguro (driver local/S3), visualizador de aulas, progresso, atribuições e trilhas automáticas por cargo.
4. **Avaliações**: banco de questões, editor de provas, realização com tempo-limite, correção manual, ajuste com justificativa, liberação, autorização de nova tentativa, histórico acadêmico com gráficos, certificados em PDF com código de validação. Testes obrigatórios do bloqueio de nota e da regra de nova tentativa.
5. **Desenvolvimento**: jornada profissional, PDI, competências, indicadores por cargo, metas mensais, medalhas, central de dúvidas e FAQ.
6. **Gestão**: relatórios com exportação (CSV/XLSX), indicadores, consulta de auditoria com filtros, política de retenção, revisão de segurança e testes finais (E2E).
