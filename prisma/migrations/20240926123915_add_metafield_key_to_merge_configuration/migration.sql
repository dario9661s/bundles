/*
  Warnings:

  - Added the required column `metafieldKey` to the `MergeConfiguration` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MergeConfiguration" ADD COLUMN     "metafieldKey" TEXT NOT NULL;
