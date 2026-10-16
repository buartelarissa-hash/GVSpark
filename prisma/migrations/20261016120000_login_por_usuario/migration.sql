-- Login passa a ser por nome de usuário; e-mail torna-se opcional.

-- User.username: preenche registros existentes a partir do e-mail (parte antes do @).
ALTER TABLE "User" ADD COLUMN "username" TEXT;
UPDATE "User" SET "username" = lower(split_part("email", '@', 1));
-- Garante unicidade caso duas contas tenham o mesmo prefixo.
UPDATE "User" u SET "username" = u."username" || '.' || substr(u."id", length(u."id") - 3)
WHERE EXISTS (SELECT 1 FROM "User" o WHERE o."username" = u."username" AND o."id" < u."id");
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- LoginAttempt.email -> identifier
DROP INDEX "LoginAttempt_email_createdAt_idx";
ALTER TABLE "LoginAttempt" RENAME COLUMN "email" TO "identifier";
CREATE INDEX "LoginAttempt_identifier_createdAt_idx" ON "LoginAttempt"("identifier", "createdAt");
