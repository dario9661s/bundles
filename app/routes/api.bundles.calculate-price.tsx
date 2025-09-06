import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { getBundle } from "~/services/bundle-metaobject.server";
import type {
  CalculatePriceRequest,
  CalculatePriceResponse,
  ErrorResponse,
  ErrorCode,
} from "~/types/bundle";

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

interface ProductPriceData {
  id: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  compareAtPrice?: {
    amount: string;
    currencyCode: string;
  };
}

// POST /api/bundles/calculate-price
export async function action({ request }: ActionFunctionArgs) {
  try {
    const { admin } = await authenticate.admin(request);
    
    if (request.method !== "POST") {
      return createErrorResponse(
        "Method not allowed",
        "VALIDATION_ERROR",
        405
      );
    }

    const data: CalculatePriceRequest = await request.json();

    // Validate request data
    if (!data.bundleId || typeof data.bundleId !== "string") {
      return createErrorResponse(
        "Bundle ID is required",
        "VALIDATION_ERROR",
        400
      );
    }

    if (!Array.isArray(data.selectedProducts) || data.selectedProducts.length === 0) {
      return createErrorResponse(
        "Selected products are required",
        "VALIDATION_ERROR",
        400
      );
    }

    // Get the bundle
    const bundle = await getBundle(admin, data.bundleId);
    
    if (!bundle) {
      return createErrorResponse(
        "Bundle not found",
        "BUNDLE_NOT_FOUND",
        404
      );
    }

    // Collect all selected product IDs
    const selectedProductIds = new Set<string>();
    data.selectedProducts.forEach(selection => {
      selection.productIds.forEach(productId => {
        selectedProductIds.add(productId);
      });
    });

    if (selectedProductIds.size === 0) {
      return createErrorResponse(
        "No products selected",
        "VALIDATION_ERROR",
        400
      );
    }

    // Fetch product prices from Shopify
    const productIds = Array.from(selectedProductIds);
    const productPricesQuery = `
      query GetProductPrices($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on ProductVariant {
            id
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
          }
        }
      }
    `;

    const response = await admin.graphql(productPricesQuery, {
      variables: { ids: productIds }
    });
    
    const result = await response.json();
    
    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      return createErrorResponse(
        "Failed to fetch product prices",
        "INTERNAL_ERROR",
        500
      );
    }

    const productPrices: ProductPriceData[] = result.data.nodes.filter(
      (node: any) => node && node.price
    );

    // Calculate original total price
    let originalPrice = 0;
    productPrices.forEach(product => {
      originalPrice += parseFloat(product.price.amount);
    });

    // Calculate discount based on bundle configuration
    let discountAmount = 0;
    let finalPrice = originalPrice;

    switch (bundle.discountType) {
      case "percentage":
        discountAmount = (originalPrice * bundle.discountValue) / 100;
        finalPrice = originalPrice - discountAmount;
        break;
      
      case "fixed":
        discountAmount = Math.min(bundle.discountValue, originalPrice);
        finalPrice = originalPrice - discountAmount;
        break;
      
      case "total":
        if (originalPrice > bundle.discountValue) {
          finalPrice = bundle.discountValue;
          discountAmount = originalPrice - finalPrice;
        } else {
          // If original price is less than target total, no discount
          finalPrice = originalPrice;
          discountAmount = 0;
        }
        break;
    }

    // Calculate savings percentage
    const savingsPercentage = originalPrice > 0 ? (discountAmount / originalPrice) * 100 : 0;

    const response_data: CalculatePriceResponse = {
      originalPrice: Math.round(originalPrice * 100) / 100, // Round to 2 decimal places
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
      savings: {
        amount: Math.round(discountAmount * 100) / 100,
        percentage: Math.round(savingsPercentage * 100) / 100,
      },
    };

    return json(response_data);
  } catch (error) {
    console.error("Error in calculate price:", error);
    return createErrorResponse(
      "Internal server error",
      "INTERNAL_ERROR",
      500,
      error
    );
  }
}