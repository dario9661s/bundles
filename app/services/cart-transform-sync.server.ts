import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { listBundles } from "./bundle-metaobject.server";
import type { Bundle } from "~/types/bundle.types";
import prisma from "~/db.server";

interface CartTransformBundle {
  id: string;
  title: string;
  discountType: "percentage" | "fixed" | "total";
  discountValue: number;
  steps: Array<{
    id: string;
    products: Array<{
      id: string;
    }>;
  }>;
}

export async function syncBundlesToCartTransform(admin: AdminApiContext, shop: string) {
  try {
    // Get the cart transform ID for this shop
    const cartTransform = await prisma.cartTransform.findFirst({
      where: { shop },
    });

    if (!cartTransform) {
      console.error("No cart transform found for shop:", shop);
      return { success: false, error: "Cart transform not configured" };
    }

    // Get all active bundles
    const { bundles } = await listBundles(admin, 1, 250, "active");
    
    // Transform bundles to cart transform format
    const cartTransformBundles: CartTransformBundle[] = bundles.map((bundle) => ({
      id: bundle.id,
      title: bundle.title,
      discountType: bundle.discountType,
      discountValue: bundle.discountValue,
      steps: bundle.steps.map((step) => ({
        id: step.id,
        products: step.products.map((product) => ({
          id: product.id,
        })),
      })),
    }));

    // Update the cart transform metafield
    const mutation = `
      mutation UpdateCartTransform($id: ID!, $metafield: MetafieldUpdateInput!) {
        cartTransformUpdate(
          id: $id
          updates: {
            metafields: [$metafield]
          }
        ) {
          cartTransform {
            id
            metafield(namespace: "mergely", key: "merge-configurations") {
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      id: cartTransform.cartTransformId,
      metafield: {
        namespace: "mergely",
        key: "merge-configurations",
        value: JSON.stringify({ bundles: cartTransformBundles }),
        type: "json",
      },
    };

    const response = await admin.graphql(mutation, { variables });
    const result = await response.json();

    if (result.data?.cartTransformUpdate?.userErrors?.length > 0) {
      console.error("Error updating cart transform:", result.data.cartTransformUpdate.userErrors);
      return { 
        success: false, 
        error: result.data.cartTransformUpdate.userErrors[0].message 
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing bundles to cart transform:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export async function syncBundleOnChange(
  admin: AdminApiContext,
  shop: string,
  bundleId: string,
  action: "create" | "update" | "delete"
) {
  // For now, we'll just sync all bundles
  // In a production app, you might want to be more efficient
  return syncBundlesToCartTransform(admin, shop);
}