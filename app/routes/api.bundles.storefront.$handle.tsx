import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { listBundles } from "~/services/bundle-metaobject.server";
import { getCombinationsByIds } from "~/services/bundle-combination.server";
import type { ErrorResponse, ErrorCode } from "~/types/bundle";

interface ProductDetails {
  id: string;
  title: string;
  handle: string;
  featuredImage?: {
    url: string;
  };
  vendor: string;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
    maxVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  availableForSale: boolean;
  variants: {
    nodes: Array<{
      id: string;
      price: {
        amount: string;
        currencyCode: string;
      };
      compareAtPrice?: {
        amount: string;
        currencyCode: string;
      };
      availableForSale: boolean;
    }>;
  };
}

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

// GET /api/bundles/storefront/:handle
export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const { admin } = await authenticate.admin(request);
    const handle = params.handle;

    if (!handle) {
      return createErrorResponse(
        "Bundle handle is required",
        "VALIDATION_ERROR",
        400
      );
    }

    // Decode handle in case it's URL-encoded
    const decodedHandle = decodeURIComponent(handle);

    // Find bundle by handle - need to fetch all and filter since metaobjects don't support handle queries
    const { bundles } = await listBundles(admin, 1, 250, "active");
    const bundle = bundles.find(b => b.handle === decodedHandle && b.status === "active");

    if (!bundle) {
      return createErrorResponse(
        "Bundle not found or not active",
        "BUNDLE_NOT_FOUND",
        404
      );
    }

    // Get all unique product IDs from bundle steps
    const allProductIds = new Set<string>();
    bundle.steps.forEach(step => {
      step.products.forEach(product => {
        allProductIds.add(product.id);
      });
    });

    // Fetch product details from Shopify
    const productQuery = `
      query GetProducts($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            handle
            featuredImage {
              url
            }
            vendor
            productType
            availableForSale
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
                amount
                currencyCode
              }
            }
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
                availableForSale
              }
            }
          }
        }
      }
    `;

    const productResponse = await admin.graphql(productQuery, {
      variables: { ids: Array.from(allProductIds) },
    });
    const productResult = await productResponse.json() as { data: { nodes: ProductDetails[] } };

    // Create product map
    const productMap = new Map<string, ProductDetails>();
    productResult.data.nodes.forEach(product => {
      productMap.set(product.id, product);
    });

    // Map bundle steps with full product details
    const stepsWithProducts = bundle.steps.map(step => ({
      ...step,
      products: step.products.map(product => {
        const details = productMap.get(product.id);
        if (!details) {
          return null;
        }
        return {
          id: product.id,
          position: product.position,
          title: details.title,
          handle: details.handle,
          featuredImage: details.featuredImage?.url,
          vendor: details.vendor,
          priceRange: {
            min: details.priceRange.minVariantPrice.amount,
            max: details.priceRange.maxVariantPrice.amount,
          },
          availableForSale: details.availableForSale,
          defaultVariant: details.variants.nodes[0] ? {
            id: details.variants.nodes[0].id,
            price: details.variants.nodes[0].price.amount,
            compareAtPrice: details.variants.nodes[0].compareAtPrice?.amount,
            availableForSale: details.variants.nodes[0].availableForSale,
          } : undefined,
        };
      }).filter(Boolean),
    }));

    // Fetch combination images if any
    let combinations = [];
    if (bundle.combinationImages && bundle.combinationImages.length > 0) {
      const bundleCombinations = await getCombinationsByIds(admin, bundle.combinationImages);
      combinations = bundleCombinations.map(combo => ({
        products: combo.products,
        imageUrl: combo.imageUrl,
        title: combo.title,
      }));
    }

    // Calculate example savings (using lowest priced products)
    let exampleSavings;
    if (bundle.discountType !== "total") {
      const minTotal = stepsWithProducts.reduce((total, step) => {
        const minProductPrice = Math.min(...step.products.map(p => 
          parseFloat(p.priceRange.min)
        ));
        return total + (minProductPrice * step.minSelections);
      }, 0);

      const discountAmount = bundle.discountType === "percentage"
        ? minTotal * (bundle.discountValue / 100)
        : bundle.discountValue;

      exampleSavings = {
        amount: discountAmount.toFixed(2),
        percentage: Math.round((discountAmount / minTotal) * 100),
      };
    }

    return json({
      bundle: {
        id: bundle.id,
        handle: bundle.handle,
        title: bundle.title,
        discountType: bundle.discountType,
        discountValue: bundle.discountValue,
        layoutType: bundle.layoutType,
        mobileColumns: bundle.mobileColumns,
        desktopColumns: bundle.desktopColumns,
        steps: stepsWithProducts,
        exampleSavings,
        combinations,
      },
    });
  } catch (error) {
    console.error("Error fetching storefront bundle:", error);
    return createErrorResponse(
      "Internal server error",
      "INTERNAL_ERROR",
      500,
      error
    );
  }
}