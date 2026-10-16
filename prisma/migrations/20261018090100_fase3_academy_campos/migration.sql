-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "restricted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "description" TEXT;

