import { AdminApiContext } from "@shopify/shopify-app-remix/server";
import CreateCartTransformMutation from "./mutations/create-cart-transform";

export async function createCartTransform(
  functionId: string,
  admin: AdminApiContext,
) {
  return admin
    .graphql(CreateCartTransformMutation, {
      variables: {
        functionId,
      },
    })
    .then((response) => response.json());
}
