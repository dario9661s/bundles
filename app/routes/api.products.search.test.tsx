import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

// Test endpoint to verify product search implementation
// GET /api/products/search/test
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { admin } = await authenticate.admin(request);
    
    // Test various search scenarios
    const testQueries = [
      { query: "", limit: 5, description: "Get first 5 products" },
      { query: "shirt", limit: 3, description: "Search for 'shirt'" },
    ];
    
    const results = [];
    
    for (const test of testQueries) {
      const query = `
        query SearchProducts($first: Int!, $query: String) {
          products(first: $first, query: $query) {
            nodes {
              id
              title
              handle
              vendor
              productType
              availableForSale
              featuredImage {
                url(transform: {maxWidth: 500, maxHeight: 500})
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
              totalVariants: totalVariants
              variants(first: 3) {
                nodes {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  availableForSale
                  image {
                    url(transform: {maxWidth: 500, maxHeight: 500})
                  }
                }
              }
            }
          }
        }
      `;
      
      const variables = {
        first: test.limit,
        query: test.query || null,
      };
      
      const response = await admin.graphql(query, { variables });
      const result = await response.json();
      
      results.push({
        test: test.description,
        query: test.query,
        limit: test.limit,
        success: !result.errors,
        productCount: result.data?.products?.nodes?.length || 0,
        sampleProduct: result.data?.products?.nodes?.[0] || null,
        errors: result.errors || null,
      });
    }
    
    return json({
      success: true,
      test: "Product search GraphQL operations",
      results,
    });
  } catch (error) {
    console.error("Test error:", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}