# GV SPARK

**Desperte seu potencial.** Plataforma corporativa de integração, aprendizagem e desenvolvimento dos colaboradores da Gigavale Atacado.

- Portal do Colaborador (`/inicio`) e Portal Administrativo — GV SPARK ADM (`/adm`), conectados ao mesmo banco.
- Arquitetura, modelo de dados, rotas e plano por fases: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Requisitos

- Node.js 20.11 ou superior (testado com Node 22)
- PostgreSQL 14 ou superior (testado com 16)

## Instalação

```bash
npm install                    # também gera o Prisma Client
cp .env.example .env           # ajuste DATABASE_URL
```

Crie o banco e o usuário (exemplo local):

```sql
CREATE USER gvspark WITH PASSWORD 'gvspark' CREATEDB;
CREATE DATABASE gvspark OWNER gvspark;
CREATE DATABASE gvspark_test OWNER gvspark;   -- usado pelos testes
```

Aplique as migrations e carregue os dados demonstrativos (somente desenvolvimento):

```bash
npm run db:migrate
npm run db:seed
```

## Execução

```bash
npm run dev            # desenvolvimento em http://localhost:3000
npm run build && npm start   # produção
```

### Usuários demonstrativos (seed de desenvolvimento)

Senha de todos: `Spark@2026`

| Perfil | Usuário |
| --- | --- |
| Administrador geral | `admin` |
| Gestor | `gestor` |
| Instrutor | `instrutor` |
| Colaborador | `colaborador`, `colaborador2` |

Todos os registros criados pelo seed têm `isDemo = true` e aparecem na interface com o selo **Demonstrativo**. O seed não cria nenhum conteúdo histórico da empresa, e sua execução é bloqueada em produção.

## Testes e verificações

```bash
npm test            # unitários + integração (usa o banco gvspark_test)
npm run typecheck
npm run lint
```

Os testes de integração usam `TEST_DATABASE_URL` (padrão: `postgresql://gvspark:gvspark@localhost:5432/gvspark_test`) e aplicam as migrations automaticamente. Eles **nunca** usam o banco de desenvolvimento.

## Primeiro acesso em produção

O seed demonstrativo não deve ser usado em produção. Para criar o primeiro administrador, insira o usuário diretamente no banco com um hash bcrypt e `mustChangePassword = true`. Uma ferramenta de linha de comando para isso está prevista para a Fase 6. Os demais usuários são cadastrados pelo Portal ADM, que gera uma senha temporária exibida uma única vez.

## Acesso dos colaboradores

- O login é feito com **nome de usuário e senha**. O e-mail é opcional.
- O administrador cria o usuário (ex.: `joao.silva`), e o sistema gera uma senha temporária. No primeiro acesso, o colaborador escolhe a própria senha.
- Se alguém esquecer a senha, o administrador ou o gestor da equipe gera uma nova senha temporária.

## Perfis

| Perfil | Pode |
| --- | --- |
| Administrador geral | Tudo: cadastrar pessoas, definir perfis, desativar acessos, configurar a plataforma |
| Gestor | Ver e **editar todos os dados dos membros da sua equipe** (cadastro, metas, feedbacks, jornada, senha temporária), exceto o perfil de acesso; não edita administradores |
| Instrutor | **Aplicar provas e corrigir/editar notas de todas as provas de todos os cursos**, liberar resultados, autorizar novas tentativas e gerenciar os próprios cursos |
| Colaborador | Ver apenas as próprias informações e os conteúdos liberados |

## Conteúdo institucional e integração (Fase 2)

- **Portal ADM › História e cultura:** seções com editor visual (história, fundadores, missão, visão, valores, propósito, cultura e vídeo do YouTube/Vimeo), linha do tempo com fotos e comunicados. Só aparece para os colaboradores o que estiver publicado.
- **Portal ADM › Organograma:** posições ocupadas ou vagas, que podem ser movidas, reordenadas e desativadas. O botão "Importar dos cadastros" monta a estrutura a partir dos gestores definidos em cada colaborador.
- **Portal ADM › Trilhas de integração:** uma trilha padrão e trilhas específicas por cargo, com as etapas e o andamento de cada colaborador.
- **Fotos:** o ADM ou o gestor trocam a foto na ficha do colaborador; o próprio colaborador troca a sua em "Meu perfil".
- O seed cria conteúdo **demonstrativo** (com o selo) para a história, a linha do tempo e o organograma. Ao editar e salvar uma seção, o selo é removido.

## GV Spark Academy (Fase 3)

- **Portal ADM › Cursos e treinamentos**
  - Cadastro completo do curso: capa, categoria, marca, instrutor, público-alvo, duração, carga horária, nível, obrigatório, data de publicação, prazo e status.
  - Módulos e aulas reordenáveis com arrastar e soltar (inclusive pelo teclado).
  - Atribuição para todos, para um departamento, para um cargo ou para colaboradores selecionados.
  - Abas **Categorias** e **Trilhas de aprendizagem**. As trilhas atribuem cursos automaticamente por cargo.
- **Editor de aulas:** blocos de texto formatado, imagem, vídeo enviado, vídeo do YouTube/Vimeo, PDF, apresentação, link, atividade e material complementar.
  - Os blocos podem ser duplicados, reordenados e excluídos.
  - A aula pode ficar como rascunho ou ser publicada, e é possível pré-visualizar antes de publicar.
- **Marcas parceiras:** logo, apresentação, categorias de produtos e materiais técnicos (arquivos, links e vídeos).
- **Para o colaborador:**
  - Catálogo com busca e filtros, e a área "Meus cursos".
  - Página do curso e visualizador de aulas com navegação e "Marcar aula como concluída".
  - Progresso por curso.
  - A conclusão do curso conclui a etapa de treinamento da integração vinculada a ele.
- **Instrutor:** gerencia apenas os cursos sob sua responsabilidade.

### Arquivos e vídeos em produção (armazenamento na nuvem)

1. Crie um bucket **privado** num serviço compatível com S3. O Cloudflare R2 é recomendado, porque não cobra pelo download dos vídeos.
2. Preencha `STORAGE_DRIVER="s3"` e as variáveis `S3_*` (veja `.env.example`).
3. Configure o **CORS** do bucket para aceitar `PUT` vindo do domínio do GV SPARK. Os arquivos sobem direto do navegador para o bucket. Exemplo para o R2:
   ```json
   [{ "AllowedOrigins": ["https://seu-dominio.com.br"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["Content-Type"], "MaxAgeSeconds": 3600 }]
   ```
4. O GV SPARK confere o tamanho e o conteúdo real de cada arquivo depois do envio. Para assistir ou baixar, a pessoa precisa estar logada e ter acesso ao curso; o sistema então gera um link que expira em 5 minutos.

Limites: imagem até 5 MB, PDF até 50 MB, apresentação até 150 MB, documento até 50 MB e vídeo até 1 GB (ajustável com `MAX_VIDEO_MB`).

## Identidade visual

- Cores: variáveis globais em `src/app/globals.css`. Azul `#023F88` e amarelo `#FFCB05` foram extraídos da logo oficial da Gigavale; o menu usa o azul-marinho `#08234A`.
- Logo oficial da Gigavale Atacado: `public/brand/gigavale-logo.png`, usada no login e no menu lateral.
- Marca do produto GV SPARK (símbolo de faísca): `src/components/brand/logo.tsx`.
