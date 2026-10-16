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

| Perfil | E-mail |
| --- | --- |
| Administrador geral | `admin@gvspark.dev` |
| Gestor | `gestor@gvspark.dev` |
| Instrutor | `instrutor@gvspark.dev` |
| Colaborador | `colaborador@gvspark.dev`, `colaborador2@gvspark.dev` |

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

## Identidade visual

- Cores: variáveis globais em `src/app/globals.css` (`navy-900 #08234A`, `navy-700 #153B69`, `spark-500 #FFCA28`, `surface #F5F7FA`).
- Logotipo **provisório**: `src/components/brand/logo.tsx`. Ele é o único ponto a trocar pela logo oficial.
