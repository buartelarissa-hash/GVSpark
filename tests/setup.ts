// Testes de integração usam um banco separado; nunca o banco de desenvolvimento.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://gvspark:gvspark@localhost:5432/gvspark_test?schema=public";
