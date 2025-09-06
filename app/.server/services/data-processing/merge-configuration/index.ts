import { AdminApiContext } from "@shopify/shopify-app-remix/server";
import prisma from "~/db.server";
import { setMetafield } from "~/.server/services/shopify/metafield-service";
import { getAllAvailableMetafieldKeys } from "~/.server/utils/metafield-keys";

type MetafieldMergeConfiguration = {
  [key: string]: string | { [key: string]: string[] } | null;
  mergeConfigurations: { [key: string]: string[] };
};

export async function refreshMergeConfiguration(
  shop: string,
  metafieldOwnerId: string,
  admin: AdminApiContext,
) {
  const mergeConfigurations = await prisma.mergeConfiguration.findMany({
    where: { shop },
  });

  const mergeConfiguration: MetafieldMergeConfiguration = {
    mergeConfigurations: {},
  };
  getAllAvailableMetafieldKeys().forEach((key) => {
    const mergeConfigurationForKey = mergeConfigurations.find(
      (mergeConfiguration) => mergeConfiguration.metafieldKey === key,
    );

    mergeConfiguration[key] =
      mergeConfigurationForKey?.lineItemProperty || null;
    if (mergeConfigurationForKey) {
      mergeConfiguration["mergeConfigurations"][
        mergeConfigurationForKey.lineItemProperty
      ] = mergeConfigurationForKey.extensionProducts;
    }
  });

  await setMetafield(
    {
      key: "merge-configurations",
      value: JSON.stringify(mergeConfiguration),
      ownerId: metafieldOwnerId,
    },
    admin,
  );
}
