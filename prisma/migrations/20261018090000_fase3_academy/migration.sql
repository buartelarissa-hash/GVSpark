-- CreateEnum
CREATE TYPE "BrandMaterialKind" AS ENUM ('FILE', 'LINK', 'VIDEO');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'READY');

-- AlterTable
ALTER TABLE "CourseAssignment" ADD COLUMN     "mandatory" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "lastLessonId" TEXT,
ADD COLUMN     "mandatory" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "FileAsset" ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "status" "FileStatus" NOT NULL DEFAULT 'READY',
ADD COLUMN     "uploadToken" TEXT;

-- CreateTable
CREATE TABLE "BrandMaterial" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "BrandMaterialKind" NOT NULL,
    "url" TEXT,
    "fileId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandMaterial_brandId_order_idx" ON "BrandMaterial"("brandId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "FileAsset_uploadToken_key" ON "FileAsset"("uploadToken");

-- CreateIndex
CREATE INDEX "FileAsset_status_expiresAt_idx" ON "FileAsset"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "BrandMaterial" ADD CONSTRAINT "BrandMaterial_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMaterial" ADD CONSTRAINT "BrandMaterial_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

