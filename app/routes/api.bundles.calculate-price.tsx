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

interface PriceData {
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

    // Create a map of step IDs to step data for quick lookup
    const stepMap = new Map(bundle.steps.map(step => [step.id, step]));

    // Collect all selected items (products or variants based on step configuration)
    const itemsToPrice: { id: string; stepId: string }[] = [];
    
    for (const selection of data.selectedProducts) {
      const step = stepMap.get(selection.stepId);
      if (!step) {
        return createErrorResponse(
          `Step ${selection.stepId} not found in bundle`,
          "VALIDATION_ERROR",
          400
        );
      }

      // Validate selection count against step requirements
      if (selection.selections.length < step.minSelections) {
        return createErrorResponse(
          `Step "${step.title}" requires at least ${step.minSelections} selections`,
          "VALIDATION_ERROR",
          400
        );
      }

      if (step.maxSelections && selection.selections.length > step.maxSelections) {
        return createErrorResponse(
          `Step "${step.title}" allows maximum ${step.maxSelections} selections`,
          "VALIDATION_ERROR",
          400
        );
      }

      // Add items based on step selection type
      for (const item of selection.selections) {
        if (step.selectionType === "variant") {
          // For variant selection, use the variantId if provided
          if (item.variantId) {
            itemsToPrice.push({ id: item.variantId, stepId: step.id });
          } else {
            return createErrorResponse(
              `Variant ID required for step "${step.title}" with variant selection type`,
              "VALIDATION_ERROR",
              400
            );
          }
        } else {
          // For product selection, fetch the default/first variant
          itemsToPrice.push({ id: item.productId, stepId: step.id });
        }
      }
    }

    if (itemsToPrice.length === 0) {
      return createErrorResponse(
        "No products selected",
        "VALIDATION_ERROR",
        400
      );
    }

    // Prepare queries based on selection types
    const productIds = itemsToPrice
      .filter(item => {
        const step = stepMap.get(item.stepId);
        return step?.selectionType === "product";
      })
      .map(item => item.id);

    const variantIds = itemsToPrice
      .filter(item => {
        const step = stepMap.get(item.stepId);
        return step?.selectionType === "variant";
      })
      .map(item => item.id);

    // Fetch prices for products (need to get their default variants)
    let productPrices: PriceData[] = [];
    if (productIds.length > 0) {
      const productQuery = `
        query GetProductPrices($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              variants(first: 1, sortKey: PRICE) {
                nodes {
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
          }
        }
      `;

      const productResponse = await admin.graphql(productQuery, {
        variables: { ids: productIds }
      });
      
      const productResult = await productResponse.json();
      
      if (productResult.errors) {
        console.error("GraphQL errors fetching products:", productResult.errors);
        return createErrorResponse(
          "Failed to fetch product prices",
          "INTERNAL_ERROR",
          500
        );
      }

      // Extract variant prices from products
      productPrices = productResult.data.nodes
        .filter((node: any) => node && node.variants?.nodes?.[0])
        .map((node: any) => ({
          id: node.variants.nodes[0].id,
          price: node.variants.nodes[0].price,
          compareAtPrice: node.variants.nodes[0].compareAtPrice,
        }));
    }

    // Fetch prices for variants directly
    let variantPrices: PriceData[] = [];
    if (variantIds.length > 0) {
      const variantQuery = `
        query GetVariantPrices($ids: [ID!]!) {
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

      const variantResponse = await admin.graphql(variantQuery, {
        variables: { ids: variantIds }
      });
      
      const variantResult = await variantResponse.json();
      
      if (variantResult.errors) {
        console.error("GraphQL errors fetching variants:", variantResult.errors);
        return createErrorResponse(
          "Failed to fetch variant prices",
          "INTERNAL_ERROR",
          500
        );
      }

      variantPrices = variantResult.data.nodes.filter(
        (node: any) => node && node.price
      );
    }

    // Combine all prices
    const allPrices = [...productPrices, ...variantPrices];

    // Calculate original total price
    let originalPrice = 0;
    allPrices.forEach(item => {
      originalPrice += parseFloat(item.price.amount);
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

    const response: CalculatePriceResponse = {
      originalPrice: Math.round(originalPrice * 100) / 100, // Round to 2 decimal places
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
      savings: {
        amount: Math.round(discountAmount * 100) / 100,
        percentage: Math.round(savingsPercentage * 100) / 100,
      },
    };

    return json(response);
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