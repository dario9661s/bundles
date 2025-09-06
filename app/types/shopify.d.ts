/**
 * This is copied from app-bridge-types/shopify.ts and used for the resource picker return types.
 * As of now, the shopify app bridge package does not export these types. See:
 * https://github.com/Shopify/shopify-app-bridge/issues/354
 */

export interface ProductVariant extends Resource {
  availableForSale: boolean;
  barcode?: string | null;
  compareAtPrice?: Money | null;
  createdAt: string;
  displayName: string;
  fulfillmentService?: {
    id: string;
    inventoryManagement: boolean;
    productBased: boolean;
    serviceName: string;
    type: FulfillmentServiceType;
  };
  image?: Image_2 | null;
  inventoryItem: {
    id: string;
  };
  inventoryManagement: ProductVariantInventoryManagement;
  inventoryPolicy: ProductVariantInventoryPolicy;
  inventoryQuantity?: number | null;
  position: number;
  price: Money;
  product: Partial<Product>;
  requiresShipping: boolean;
  selectedOptions: {
    value?: string | null;
  }[];
  sku?: string | null;
  taxable: boolean;
  title: string;
  weight?: number | null;
  weightUnit: WeightUnit;
  updatedAt: string;
}

export interface Product extends Resource {
  availablePublicationCount: number;
  createdAt: string;
  descriptionHtml: string;
  handle: string;
  hasOnlyDefaultVariant: boolean;
  images: Image_2[];
  options: {
    id: string;
    name: string;
    position: number;
    values: string[];
  }[];
  productType: string;
  publishedAt?: string | null;
  tags: string[];
  templateSuffix?: string | null;
  title: string;
  totalInventory: number;
  totalVariants: number;
  tracksInventory: boolean;
  variants: (Partial<ProductVariant> & Pick<ProductVariant, "id">)[]; // The variant id is not optional
  vendor: string;
  updatedAt: string;
  status: ProductStatus;
}

interface Resource {
  id: string;
}

interface Image_2 {
  id: string;
  altText?: string;
  originalSrc: string;
}

enum ProductStatus {
  Active = "ACTIVE",
  Archived = "ARCHIVED",
  Draft = "DRAFT",
}

enum FulfillmentServiceType {
  GiftCard = "GIFT_CARD",
  Manual = "MANUAL",
  ThirdParty = "THIRD_PARTY",
}

enum WeightUnit {
  Kilograms = "KILOGRAMS",
  Grams = "GRAMS",
  Pounds = "POUNDS",
  Ounces = "OUNCES",
}

enum ProductVariantInventoryManagement {
  Shopify = "SHOPIFY",
  NotManaged = "NOT_MANAGED",
  FulfillmentService = "FULFILLMENT_SERVICE",
}

enum ProductVariantInventoryPolicy {
  Deny = "DENY",
  Continue = "CONTINUE",
}

type Money = string;
