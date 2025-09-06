// Bundle types based on AGENT_CONTRACTS.md Contract 1

// Layout-specific settings from Contract 7
export interface LayoutSettings {
  // Grid-specific settings
  gridSettings?: {
    productsPerRow: {
      mobile: 1 | 2; // Default: 2
      tablet: 2 | 3 | 4; // Default: 3
      desktop: 3 | 4 | 5 | 6; // Default: 4
    };
    enableQuickAdd: boolean; // Default: true
    imagePosition: "top" | "left"; // Default: "top" - changes HTML structure
  };
  
  // Slider-specific settings
  sliderSettings?: {
    slidesToShow: {
      mobile: 1 | 2; // Default: 1
      tablet: 2 | 3; // Default: 2
      desktop: 3 | 4 | 5; // Default: 4
    };
    slidesToScroll: number; // Default: 1
    infiniteLoop: boolean; // Default: true
    autoplay: boolean; // Default: false
    autoplaySpeed: number; // milliseconds, Default: 5000
    enableThumbnails: boolean; // Default: false
  };
  
  // Modal-specific settings
  modalSettings?: {
    triggerType: "button" | "auto" | "exit-intent"; // Default: "button"
    modalBehavior: "closeOnAdd" | "stayOpen" | "redirectToCart"; // Default: "stayOpen"
    blockPageScroll: boolean; // Default: true
    modalSize: "productCount" | "fixed"; // Default: "fixed"
  };
  
  // Selection Box settings (Build-your-box)
  selectionSettings?: {
    selectionMode: "click" | "drag" | "both"; // Default: "click"
    emptySlotBehavior: "hide" | "show" | "showGhost"; // Default: "show"
    progressTracking: "counter" | "percentage" | "visual"; // Default: "counter"
    selectionLimit: number; // Max selections across all steps
  };
}

export interface Bundle {
  id: string;
  handle: string;
  title: string;
  status: "active" | "inactive" | "draft";
  discountType: "percentage" | "fixed" | "total";
  discountValue: number;
  layoutType: "grid" | "slider" | "modal" | "selection";
  mobileColumns: number; // 1-4
  desktopColumns: number; // 1-6
  steps: BundleStep[];
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  layoutSettings?: LayoutSettings; // Added per Contract 7
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
  // Frontend will fetch product details separately
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

export interface GetBundleResponse {
  bundle: Bundle;
}

export interface CreateBundleRequest {
  title: string;
  status: "active" | "draft";
  discountType: "percentage" | "fixed" | "total";
  discountValue: number;
  layoutType: "grid" | "slider" | "modal" | "selection";
  mobileColumns: number;
  desktopColumns: number;
  layoutSettings?: LayoutSettings; // Added per Contract 7
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

export interface DeleteBundleResponse {
  success: boolean;
}

// Bundle duplication types
export interface DuplicateBundleRequest {
  title: string; // New title for the duplicate
  status?: "active" | "draft"; // Default: "draft"
}

export interface DuplicateBundleResponse {
  bundle: Bundle;
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

// Product search types
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