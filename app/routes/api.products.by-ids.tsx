import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const url = new URL(request.url);
  const productIds = url.searchParams.get("ids")?.split(",") || [];

  if (productIds.length === 0) {
    return json({ products: [] });
  }

  try {
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

    const { data } = await response.json();

    // Transform response to match our interface
    const products = data.nodes
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
    return json({ products: [] });
  }
};