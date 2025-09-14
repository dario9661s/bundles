import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

interface CreateProductResponse {
  data: {
    productCreate: {
      product: {
        id: string;
        handle: string;
        title: string;
      } | null;
      userErrors: Array<{
        field: string[];
        message: string;
      }>;
    };
  };
}

interface UpdateProductResponse {
  data: {
    productUpdate: {
      product: {
        id: string;
        title: string;
      } | null;
      userErrors: Array<{
        field: string[];
        message: string;
      }>;
    };
  };
}

interface CheckHandleResponse {
  data: {
    productByHandle: {
      id: string;
    } | null;
  };
}

export async function createBundleProduct(
  admin: AdminApiContext,
  bundleTitle: string,
  bundleHandle: string,
  bundleStatus: "active" | "inactive" | "draft" = "draft"
): Promise<{ productId: string | null; errors: string[] }> {
  try {
    // Generate a unique handle by checking for duplicates
    let handle = bundleHandle;
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      const checkQuery = `
        query CheckProductHandle($handle: String!) {
          productByHandle(handle: $handle) {
            id
          }
        }
      `;

      const checkResponse = await admin.graphql(checkQuery, {
        variables: { handle },
      });
      const checkResult = (await checkResponse.json()) as CheckHandleResponse;

      if (checkResult.data.productByHandle === null) {
        isUnique = true;
      } else {
        handle = `${bundleHandle}-${counter}`;
        counter++;
      }
    }

    // Create the product
    const mutation = `
      mutation CreateBundleProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            handle
            title
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        title: bundleTitle,
        handle,
        status: bundleStatus === "active" ? "ACTIVE" : "DRAFT", // inactive also maps to DRAFT
        productType: "Bundle",
        vendor: "Adsgun Bundles",
        metafields: [
          {
            namespace: "adsgun_bundles",
            key: "bundle_id",
            value: bundleHandle,
            type: "single_line_text_field",
          },
        ],
      },
    };

    const response = await admin.graphql(mutation, { variables });
    const result = (await response.json()) as CreateProductResponse;

    console.log("GraphQL productCreate response:", JSON.stringify(result, null, 2));

    if (result.data.productCreate.userErrors.length > 0) {
      console.error("Product creation user errors:", result.data.productCreate.userErrors);
      return {
        productId: null,
        errors: result.data.productCreate.userErrors.map((e) => e.message),
      };
    }

    const productId = result.data.productCreate.product?.id || null;
    console.log("Created product with ID:", productId);

    return {
      productId,
      errors: [],
    };
  } catch (error) {
    console.error("Error creating bundle product:", error);
    return {
      productId: null,
      errors: [error instanceof Error ? error.message : "Unknown error creating product"],
    };
  }
}

export async function updateBundleProduct(
  admin: AdminApiContext,
  productId: string,
  updates: {
    title?: string;
    status?: "active" | "inactive" | "draft";
  }
): Promise<{ success: boolean; errors: string[] }> {
  try {
    const mutation = `
      mutation UpdateBundleProduct($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            title
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const input: any = {
      id: productId,
    };
    
    if (updates.title !== undefined) {
      input.title = updates.title;
    }
    
    if (updates.status !== undefined) {
      // Map bundle status to product status
      // active → ACTIVE, draft/inactive → DRAFT
      input.status = updates.status === "active" ? "ACTIVE" : "DRAFT";
    }
    
    const variables = {
      input,
    };

    const response = await admin.graphql(mutation, { variables });
    const result = (await response.json()) as UpdateProductResponse;

    if (result.data.productUpdate.userErrors.length > 0) {
      return {
        success: false,
        errors: result.data.productUpdate.userErrors.map((e) => e.message),
      };
    }

    return {
      success: !!result.data.productUpdate.product,
      errors: [],
    };
  } catch (error) {
    console.error("Error updating bundle product:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error updating product"],
    };
  }
}