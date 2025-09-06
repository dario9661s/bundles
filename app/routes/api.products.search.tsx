import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import type { ProductSearchResponse } from "~/types/bundle";

// Mock product data for development
const MOCK_PRODUCTS = [
  {
    id: "gid://shopify/Product/1234567890",
    title: "Classic Sunglasses",
    handle: "classic-sunglasses",
    featuredImage: "https://cdn.shopify.com/s/files/1/placeholder/product1.jpg",
    vendor: "Summer Co.",
    productType: "Sunglasses",
    availableForSale: true,
    priceRange: {
      min: "29.99",
      max: "39.99"
    },
    variantsCount: 3,
    variants: [
      {
        id: "gid://shopify/ProductVariant/1111111",
        title: "Black",
        price: "29.99",
        availableForSale: true,
      },
      {
        id: "gid://shopify/ProductVariant/2222222",
        title: "Brown",
        price: "34.99",
        availableForSale: true,
      },
      {
        id: "gid://shopify/ProductVariant/3333333",
        title: "Blue",
        price: "39.99",
        availableForSale: false,
      }
    ]
  },
  {
    id: "gid://shopify/Product/1234567891",
    title: "Beach Hat",
    handle: "beach-hat",
    featuredImage: "https://cdn.shopify.com/s/files/1/placeholder/product2.jpg",
    vendor: "Beach Gear Ltd.",
    productType: "Hats",
    availableForSale: true,
    priceRange: {
      min: "19.99",
      max: "19.99"
    },
    variantsCount: 1,
    variants: [
      {
        id: "gid://shopify/ProductVariant/4444444",
        title: "One Size",
        price: "19.99",
        availableForSale: true,
      }
    ]
  },
  {
    id: "gid://shopify/Product/1234567892",
    title: "Waterproof Phone Case",
    handle: "waterproof-phone-case",
    vendor: "Tech Protect",
    productType: "Phone Accessories",
    availableForSale: true,
    priceRange: {
      min: "14.99",
      max: "24.99"
    },
    variantsCount: 2,
    variants: [
      {
        id: "gid://shopify/ProductVariant/5555555",
        title: "Universal",
        price: "14.99",
        availableForSale: true,
      },
      {
        id: "gid://shopify/ProductVariant/6666666",
        title: "XL Size",
        price: "24.99",
        availableForSale: true,
      }
    ]
  },
  {
    id: "gid://shopify/Product/2234567890",
    title: "Winter Coat",
    handle: "winter-coat",
    featuredImage: "https://cdn.shopify.com/s/files/1/placeholder/product3.jpg",
    vendor: "Winter Wear Co.",
    productType: "Coats",
    availableForSale: true,
    priceRange: {
      min: "149.99",
      max: "199.99"
    },
    variantsCount: 4,
    variants: [
      {
        id: "gid://shopify/ProductVariant/7777777",
        title: "Small / Black",
        price: "149.99",
        availableForSale: true,
      },
      {
        id: "gid://shopify/ProductVariant/8888888",
        title: "Medium / Black",
        price: "149.99",
        availableForSale: true,
      },
      {
        id: "gid://shopify/ProductVariant/9999999",
        title: "Large / Navy",
        price: "199.99",
        availableForSale: true,
      },
      {
        id: "gid://shopify/ProductVariant/0000000",
        title: "XL / Navy",
        price: "199.99",
        availableForSale: false,
      }
    ]
  },
  {
    id: "gid://shopify/Product/3234567890",
    title: "Face Cleanser",
    handle: "face-cleanser",
    featuredImage: "https://cdn.shopify.com/s/files/1/placeholder/product4.jpg",
    vendor: "Skin Care Plus",
    productType: "Skincare",
    availableForSale: true,
    priceRange: {
      min: "24.99",
      max: "24.99"
    },
    variantsCount: 1,
    variants: [
      {
        id: "gid://shopify/ProductVariant/1111222",
        title: "150ml",
        price: "24.99",
        availableForSale: true,
      }
    ]
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Note: In production, you'd use authenticate.admin(request)
  // For now, we'll skip authentication for the mock endpoint
  
  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.toLowerCase() || "";
  const limit = parseInt(url.searchParams.get("limit") || "50");

  // Simple search filter
  let filteredProducts = MOCK_PRODUCTS;
  if (query) {
    filteredProducts = MOCK_PRODUCTS.filter(product => 
      product.title.toLowerCase().includes(query) ||
      product.vendor.toLowerCase().includes(query) ||
      product.productType.toLowerCase().includes(query)
    );
  }

  // Limit results
  const products = filteredProducts.slice(0, limit);

  const response: ProductSearchResponse = {
    products,
  };

  return json(response);
};