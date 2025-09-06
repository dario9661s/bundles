-- CreateTable
CREATE TABLE "MergeConfiguration" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "lineItemProperty" TEXT NOT NULL,
    "parentProductVariantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MergeConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MergeConfiguration_shop_lineItemProperty_key" ON "MergeConfiguration"("shop", "lineItemProperty");
