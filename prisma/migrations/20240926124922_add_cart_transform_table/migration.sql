-- CreateTable
CREATE TABLE "CartTransform" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "functionId" TEXT NOT NULL,
    "cartTransformId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartTransform_pkey" PRIMARY KEY ("id")
);
