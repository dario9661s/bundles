// Types from AGENT_CONTRACTS.md - Contract 1
export interface Bundle {
  id: string;
  handle: string;
  title: string;
  status: "active" | "inactive" | "draft";
  discountType: "percentage" | "fixed" | "total";
  discountValue: number;
  layoutType: "grid" | "slider" | "portrait" | "landscape";
  mobileColumns: number; // 1-4
  desktopColumns: number; // 1-6
  steps: BundleStep[];
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

export interface BundleStep {
  id: string;
  title: string;
  description?: string;
  position: number;
  minSelections: number;
  maxSelections?: number; // null = unlimited
  required: boolean;
  products: BundleProduct[];
}

export interface BundleProduct {
  id: string; // Shopify GID
  position: number;
}

// API Request/Response types
export interface ListBundlesRequest {
  page?: number; // default: 1
  limit?: number; // default: 20
  status?: "active" | "inactive" | "draft" | "all"; // default: "all"
}

export interface ListBundlesResponse {
  bundles: Bundle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

export interface GetBundleRequest {
  id: string; // URL parameter
}

export interface GetBundleResponse {
  bundle: Bundle;
}

export interface CreateBundleRequest {
  title: string;
  status: "active" | "draft";
  discountType: "percentage" | "fixed" | "total";
  discountValue: number;
  layoutType: "grid" | "slider" | "portrait" | "landscape";
  mobileColumns: number;
  desktopColumns: number;
  steps: Array<{
    title: string;
    description?: string;
    position: number;
    minSelections: number;
    maxSelections?: number;
    required: boolean;
    products: Array<{
      id: string; // Shopify GID
      position: number;
    }>;
  }>;
}

export interface CreateBundleResponse {
  bundle: Bundle;
}

export interface UpdateBundleRequest extends Partial<CreateBundleRequest> {
  // All fields optional for partial updates
}

export interface UpdateBundleResponse {
  bundle: Bundle;
}

export interface DeleteBundleRequest {
  id: string; // URL parameter
}

export interface DeleteBundleResponse {
  success: boolean;
}

// Error handling types
export interface ErrorResponse {
  error: true;
  message: string;
  code: ErrorCode;
  details?: any;
}

export type ErrorCode =
  | "BUNDLE_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR"
  | "DUPLICATE_BUNDLE"
  | "LIMIT_EXCEEDED";

// Contract 2: Product Search types
export interface ProductSearchRequest {
  query?: string;
  limit?: number; // default: 50
}

export interface ProductSearchResponse {
  products: Array<{
    id: string; // Shopify GID
    title: string;
    handle: string;
    featuredImage?: string; // URL of the featured image
    vendor: string;
    productType: string;
    availableForSale: boolean;
    priceRange: {
      min: string; // Money format e.g., "10.00"
      max: string; // Money format e.g., "25.00"
    };
    variantsCount: number;
    // Basic variant info for immediate display needs
    variants: Array<{
      id: string; // Shopify GID
      title: string;
      price: string; // Money format
      availableForSale: boolean;
      image?: string; // Variant specific image if different from product
    }>;
  }>;
}

// Contract 5: Bundle Price Calculation types
export interface CalculatePriceRequest {
  bundleId: string;
  selectedProducts: Array<{
    stepId: string;
    productIds: string[];
  }>;
}

export interface CalculatePriceResponse {
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  savings: {
    amount: number;
    percentage: number;
  };
}

// Contract 3: Bundle Step Management types
export interface AddStepRequest {
  title: string;
  description?: string;
  position?: number; // If not provided, adds to end
  minSelections: number;
  maxSelections?: number;
  required: boolean;
  products: Array<{
    id: string; // Shopify GID
    position: number;
  }>;
}

export interface AddStepResponse {
  step: BundleStep;
}

export interface UpdateStepRequest {
  title?: string;
  description?: string;
  minSelections?: number;
  maxSelections?: number;
  required?: boolean;
  products?: Array<{
    id: string; // Shopify GID
    position: number;
  }>;
}

export interface UpdateStepResponse {
  step: BundleStep;
}

export interface RemoveStepResponse {
  success: boolean;
}

export interface ReorderStepsRequest {
  stepOrder: Array<{
    stepId: string;
    position: number;
  }>;
}

export interface ReorderStepsResponse {
  steps: BundleStep[];
}