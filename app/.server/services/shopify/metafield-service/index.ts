import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import MetaFieldSetMutation from "./mutations/set-metafield";

export function setMetafield(
  { key, value, ownerId }: { key: string; value: string; ownerId: string },
  admin: AdminApiContext,
) {
  return admin.graphql(MetaFieldSetMutation, {
    variables: {
      metafields: [
        {
          type: "json",
          key,
          value,
          ownerId,
        },
      ],
    },
  });
}
