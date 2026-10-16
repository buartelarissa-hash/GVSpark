-- AlterTable
ALTER TABLE "OnboardingStep" ADD COLUMN     "content" JSONB,
ADD COLUMN     "linkUrl" TEXT;

-- AlterTable
ALTER TABLE "OnboardingTrack" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingTrack_positionId_key" ON "OnboardingTrack"("positionId");

