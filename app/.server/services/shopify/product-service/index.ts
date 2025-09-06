import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import ProductVariantQuery from "./queries/product-variant";

export async function fetchProductVariant(id: string, admin: AdminApiContext) {
  return admin
    .graphql(ProductVariantQuery, {
      variables: {
        id,
      },
    })
    .then((response) => response.json())
    .then((response) => response.data);
}
