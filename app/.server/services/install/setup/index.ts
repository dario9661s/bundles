import { AdminApiContext } from "@shopify/shopify-app-remix/server";
import prisma from "~/db.server";
import { createCartTransform } from "~/.server/services/shopify/cart-transform-service";

export async function ensureCartTransformForShop(
  shop: string,
  admin: AdminApiContext,
) {
  const functionId = process.env.CART_TRANSFORM_FUNCTION_ID;
  if (!functionId) {
    console.error("Function ID not set in env.");

    return;
  }

  const existingCartTransform = (
    await prisma.cartTransform.findMany({
      where: { shop },
      orderBy: { id: "desc" },
      take: 1,
    })
  )[0];

  if (existingCartTransform) {
    console.log(`Cart transform already exists in db for shop "${shop}".`);

    return existingCartTransform;
  }

  const createCartTransformResponse = await createCartTransform(
    functionId,
    admin,
  );
  const cartTransform =
    createCartTransformResponse.data?.cartTransformCreate?.cartTransform;
  if (!cartTransform) {
    console.error(
      "Could not install cart transform.",
      createCartTransformResponse,
      createCartTransformResponse?.data?.cartTransformCreate?.userErrors,
    );

    throw new Response(
      "Could not install cart transform. Please contact developer.",
      { status: 500 },
    );
  }

  console.log(`Installed cart transform for shop "${shop}".`);

  return prisma.cartTransform.create({
    data: {
      shop,
      functionId,
      cartTransformId: cartTransform.id,
    },
  });
}
