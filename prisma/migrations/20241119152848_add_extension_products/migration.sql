/*
  Warnings:

  - You are about to drop the column `parentProductVariantId` on the `MergeConfiguration` table. All the data in the column will be lost.
  - Added the required column `extensionProducts` to the `MergeConfiguration` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MergeConfiguration" DROP COLUMN "parentProductVariantId",
ADD COLUMN     "extensionProducts" JSONB NOT NULL;
