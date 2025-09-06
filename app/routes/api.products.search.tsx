import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import type { ProductSearchResponse } from "~/types/bundle";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("query") || "";
  const limit = parseInt(url.searchParams.get("limit") || "50");
  
  // Validate limit
  if (limit > 250 || limit < 1) {
    return json({ 
      products: [], 
      error: "Limit must be between 1 and 250" 
    }, { status: 400 });
  }

  try {
    console.log('API: Fetching products with limit:', limit, 'query:', searchQuery);
    
    // GraphQL query to fetch real products from Shopify
    // Remove the query parameter if it's empty to get all products
    const productsQuery = searchQuery ? `
      query searchProducts($first: Int!, $query: String!) {
        products(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
          nodes {
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
            variants(first: 3) {
              nodes {
                id
                title
                price
                availableForSale
                image {
                  url
                }
              }
            }
          }
        }
      }
    ` : `
      query getAllProducts($first: Int!) {
        products(first: $first, sortKey: CREATED_AT, reverse: true) {
          nodes {
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
            variants(first: 3) {
              nodes {
                id
                title
                price
                availableForSale
                image {
                  url
                }
              }
            }
          }
        }
      }
    `;

    const variables = searchQuery 
      ? { first: limit, query: searchQuery }
      : { first: limit };

    console.log('API: GraphQL variables:', variables);
    const response = await admin.graphql(productsQuery, { variables });

    const result = await response.json();
    
    console.log('API: GraphQL response:', JSON.stringify(result, null, 2));
    
    // Check for GraphQL errors
    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      throw new Error("GraphQL query failed");
    }

    // Check if we have products
    if (!result.data?.products?.nodes) {
      console.warn("No products found in response. Full result:", result);
      return json({ products: [] });
    }

    // Transform Shopify GraphQL response to match our interface
    const products = result.data.products.nodes.map((product: any) => ({
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
      },
      variantsCount: product.variants.nodes.length,
      variants: product.variants.nodes.slice(0, 3).map((variant: any) => ({ // Ensure max 3 variants
        id: variant.id,
        title: variant.title,
        price: variant.price,
        availableForSale: variant.availableForSale,
        image: variant.image?.url || null
      }))
    }));

    const apiResponse: ProductSearchResponse = {
      products,
    };

    console.log(`Successfully fetched ${products.length} products`);
    return json(apiResponse);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    console.error("Error details:", error instanceof Error ? error.message : "Unknown error");
    
    // Return empty array with error information
    const response: ProductSearchResponse = {
      products: [],
    };

    return json(response);
  }
};