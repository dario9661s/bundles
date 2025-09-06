import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import type { ErrorResponse, ErrorCode } from "~/types/bundle";

function createErrorResponse(
  message: string,
  code: ErrorCode,
  status: number,
  details?: any
): Response {
  const errorResponse: ErrorResponse = {
    error: true,
    message,
    code,
    details,
  };
  return json(errorResponse, { status });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { admin } = await authenticate.admin(request);
    
    const url = new URL(request.url);
    const idsParam = url.searchParams.get("ids");
    
    if (!idsParam) {
      return json({ products: [] });
    }
    
    const productIds = idsParam.split(",").filter(id => id.trim() !== "");
    
    if (productIds.length === 0) {
      return json({ products: [] });
    }
    
    // Validate max number of IDs to prevent huge queries
    if (productIds.length > 100) {
      return createErrorResponse(
        "Maximum 100 product IDs allowed per request",
        "LIMIT_EXCEEDED",
        400
      );
    }
    
    // Basic validation for Shopify GID format
    const invalidIds = productIds.filter(id => 
      !id.startsWith("gid://shopify/Product/")
    );
    
    if (invalidIds.length > 0) {
      return createErrorResponse(
        "Invalid product ID format. Product IDs must be Shopify GIDs",
        "VALIDATION_ERROR",
        400,
        { invalidIds }
      );
    }

    // Build GraphQL query for multiple products by ID
    const productsQuery = `
      query getProductsByIds($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            handle
            vendor
            productType
            status
            featuredImage {
              url
            }
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    `;

    const response = await admin.graphql(productsQuery, {
      variables: {
        ids: productIds
      }
    });

    const result = await response.json();
    
    // Check for GraphQL errors
    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      return createErrorResponse(
        "Failed to fetch products from Shopify",
        "INTERNAL_ERROR",
        500,
        { graphqlErrors: result.errors }
      );
    }
    
    // Transform response to match our interface
    const products = result.data.nodes
      .filter((node: any) => node !== null)
      .map((product: any) => ({
        id: product.id,
        title: product.title,
        handle: product.handle,
        featuredImage: product.featuredImage?.url || null,
        vendor: product.vendor || "",
        productType: product.productType || "",
        availableForSale: product.status === 'ACTIVE',
        priceRange: {
          min: product.priceRangeV2.minVariantPrice.amount,
          max: product.priceRangeV2.maxVariantPrice.amount
        }
      }));

    return json({ products });
  } catch (error) {
    console.error("Failed to fetch products by IDs:", error);
    return createErrorResponse(
      "Internal server error",
      "INTERNAL_ERROR",
      500,
      error instanceof Error ? { message: error.message } : undefined
    );
  }
};