// Testes de integração usam um banco separado; nunca o banco de desenvolvimento.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://gvspark:gvspark@localhost:5432/gvspark_test?schema=public";

// Arquivos dos testes vão para uma pasta temporária.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
process.env.STORAGE_DRIVER = "local";
process.env.STORAGE_LOCAL_DIR = mkdtempSync(path.join(tmpdir(), "gvspark-test-"));
