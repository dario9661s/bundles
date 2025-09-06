import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient;

  namespace PrismaJson {
    type ShopifyNodes = string[];
  }
}

const prisma: PrismaClient = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
}

export default prisma;
