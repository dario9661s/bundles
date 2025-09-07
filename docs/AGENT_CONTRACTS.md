# Agent Contracts - Frontend/Backend Communication

## Overview
This document defines the contracts between Frontend and Backend agents. Both agents MUST reference this document for data structures and API specifications.

---

## 🤝 Contract 1: Bundle Management

### Shared Types
```typescript
// Both agents use these exact types
interface Bundle {
  id: string
  handle: string
  title: string
  status: "active" | "inactive" | "draft"
  discountType: "percentage" | "fixed" | "total"
  discountValue: number
  layoutType: "grid" | "slider" | "portrait" | "landscape"
  mobileColumns: number // 1-4
  desktopColumns: number // 1-6
  steps: BundleStep[]
  createdAt: string // ISO date
  updatedAt: string // ISO date
}

interface BundleStep {
  id: string
  title: string
  description?: string
  position: number
  minSelections: number
  maxSelections?: number // null = unlimited
  required: boolean
  products: BundleProduct[]
}

interface BundleProduct {
  id: string // Shopify GID
  position: number
  // Frontend will fetch product details separately
}
```

### API Endpoints

#### List Bundles
```typescript
// GET /app/api/bundles
interface ListBundlesRequest {
  page?: number // default: 1
  limit?: number // default: 20
  status?: "active" | "inactive" | "draft" | "all" // default: "all"
}

interface ListBundlesResponse {
  bundles: Bundle[]
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
  }
}
```

#### Get Single Bundle
```typescript
// GET /app/api/bundles/:id
interface GetBundleRequest {
  id: string // URL parameter
}

interface GetBundleResponse {
  bundle: Bundle
}
```

#### Create Bundle
```typescript
// POST /app/api/bundles
interface CreateBundleRequest {
  title: string
  status: "active" | "draft"
  discountType: "percentage" | "fixed" | "total"
  discountValue: number
  layoutType: "grid" | "slider" | "portrait" | "landscape"
  mobileColumns: number
  desktopColumns: number
  steps: Array<{
    title: string
    description?: string
    position: number
    minSelections: number
    maxSelections?: number
    required: boolean
    products: Array<{
      id: string // Shopify GID
      position: number
    }>
  }>
}

interface CreateBundleResponse {
  bundle: Bundle
}
```

#### Update Bundle
```typescript
// PUT /app/api/bundles/:id
interface UpdateBundleRequest extends Partial<CreateBundleRequest> {
  // All fields optional for partial updates
}

interface UpdateBundleResponse {
  bundle: Bundle
}
```

#### Delete Bundle
```typescript
// DELETE /app/api/bundles/:id
interface DeleteBundleRequest {
  id: string // URL parameter
}

interface DeleteBundleResponse {
  success: boolean
}
```

---

## 🤝 Contract 2: Product Search

### Get Products for Bundle
```typescript
// GET /app/api/products/search
interface ProductSearchRequest {
  query?: string
  limit?: number // default: 50
}

interface ProductSearchResponse {
  products: Array<{
    id: string // Shopify GID
    title: string
    handle: string
    featuredImage?: string // URL of the featured image
    vendor: string
    productType: string
    availableForSale: boolean
    priceRange: {
      min: string // Money format e.g., "10.00"
      max: string // Money format e.g., "25.00"
    }
    variantsCount: number
    // Basic variant info for immediate display needs
    variants: Array<{
      id: string // Shopify GID
      title: string
      price: string // Money format
      availableForSale: boolean
      image?: string // Variant specific image if different from product
    }>
  }>
}
```

---

## 🤝 Contract 3: Bundle Step Management

### Add Step to Bundle
```typescript
// POST /app/api/bundles/:bundleId/steps
interface AddStepRequest {
  title: string
  description?: string
  position?: number // If not provided, adds to end
  minSelections: number
  maxSelections?: number
  required: boolean
  products: Array<{
    id: string // Shopify GID
    position: number
  }>
}

interface AddStepResponse {
  step: BundleStep
}
```

### Update Step
```typescript
// PUT /app/api/bundles/:bundleId/steps/:stepId
interface UpdateStepRequest {
  title?: string
  description?: string
  minSelections?: number
  maxSelections?: number
  required?: boolean
  products?: Array<{
    id: string // Shopify GID
    position: number
  }>
}

interface UpdateStepResponse {
  step: BundleStep
}
```

### Remove Step
```typescript
// DELETE /app/api/bundles/:bundleId/steps/:stepId
interface RemoveStepResponse {
  success: boolean
}
```

### Reorder Steps
```typescript
// POST /app/api/bundles/:bundleId/steps/reorder
interface ReorderStepsRequest {
  stepOrder: Array<{
    stepId: string
    position: number
  }>
}

interface ReorderStepsResponse {
  steps: BundleStep[]
}
```

---

## 🤝 Contract 4: Bundle Duplication

### Duplicate Bundle
```typescript
// POST /app/api/bundles/:bundleId/duplicate
interface DuplicateBundleRequest {
  title: string // New title for the duplicate
  status?: "active" | "draft" // Default: "draft"
}

interface DuplicateBundleResponse {
  bundle: Bundle
}
```

---

## 🤝 Contract 5: Bundle Preview

### Calculate Bundle Price
```typescript
// POST /app/api/bundles/calculate-price
interface CalculatePriceRequest {
  bundleId: string
  selectedProducts: Array<{
    stepId: string
    productIds: string[]
  }>
}

interface CalculatePriceResponse {
  originalPrice: number
  discountAmount: number
  finalPrice: number
  savings: {
    amount: number
    percentage: number
  }
}
```

---

## 📋 Error Handling Contract

All endpoints return errors in this format:

```typescript
interface ErrorResponse {
  error: true
  message: string
  code: ErrorCode
  details?: any
}

type ErrorCode = 
  | "BUNDLE_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR"
  | "DUPLICATE_BUNDLE"
  | "LIMIT_EXCEEDED"
```

### HTTP Status Codes
- 200: Success
- 400: Validation Error
- 401: Unauthorized
- 404: Not Found
- 409: Conflict (duplicate)
- 500: Internal Error

---

## 🔄 Frontend Component Props

Based on API responses, frontend components expect:

### BundleList Component
```typescript
interface BundleListProps {
  bundles: Bundle[]
  pagination: ListBundlesResponse['pagination']
  onEdit: (bundleId: string) => void
  onDelete: (bundleId: string) => Promise<void>
  onStatusToggle: (bundleId: string, status: Bundle['status']) => Promise<void>
}
```

### BundleForm Component
```typescript
interface BundleFormProps {
  bundle?: Bundle // undefined for create, defined for edit
  onSubmit: (data: CreateBundleRequest | UpdateBundleRequest) => Promise<void>
  onCancel: () => void
}
```

### ProductPicker Component
```typescript
interface ProductPickerProps {
  selectedProducts: string[]
  onSelect: (productIds: string[]) => void
  maxSelections?: number
}
```

---

## 🎯 Implementation Order

1. Backend implements metaobject helpers
2. Backend creates API endpoints following contracts
3. Frontend builds components expecting contract data
4. Integration testing using contract as reference

---

## 🤝 Contract 6: Theme App Block

### Bundle Display Data
```typescript
// GET /app/api/bundles/storefront/:handle
interface StorefrontBundleRequest {
  handle: string // URL parameter - bundle handle
  currency?: string // Optional currency code (e.g., "USD", "CAD")
}

interface StorefrontBundleResponse {
  bundle: {
    id: string
    handle: string
    title: string
    discountType: "percentage" | "fixed" | "total"
    discountValue: number
    layoutType: "grid" | "slider" | "portrait" | "landscape"
    mobileColumns: number
    desktopColumns: number
    steps: Array<{
      id: string
      title: string
      description?: string
      position: number
      minSelections: number
      maxSelections?: number
      required: boolean
      products: Array<{
        id: string // Shopify GID
        position: number
        // Product details for display
        title: string
        handle: string
        featuredImage?: string
        vendor: string
        priceRange: {
          min: string // Formatted price "10.00"
          max: string
        }
        availableForSale: boolean
        // First variant for quick add
        defaultVariant: {
          id: string
          price: string
          compareAtPrice?: string
          availableForSale: boolean
        }
      }>
    }>
    // Pre-calculated example savings
    exampleSavings?: {
      amount: string // "25.00"
      percentage: number // 20
    }
  }
}
```

### Add Bundle to Cart
```typescript
// POST /app/api/bundles/add-to-cart
interface AddBundleToCartRequest {
  bundleId: string
  selections: Array<{
    stepId: string
    variantIds: string[] // Selected variant IDs
  }>
  // Optional cart attributes for tracking
  attributes?: {
    bundleHandle: string
    bundleTitle: string
    discountType: string
    discountValue: string
  }
}

interface AddBundleToCartResponse {
  success: boolean
  cartLines: Array<{
    variantId: string
    quantity: number
    attributes: Record<string, string>
  }>
  // For redirect to cart
  cartUrl?: string
}
```

### App Block Settings Schema
```typescript
// This defines what settings the merchant can configure in theme editor
interface AppBlockSettings {
  // Display settings
  heading?: string // Default: bundle.title
  showSavings: boolean // Default: true
  buttonText: string // Default: "Add Bundle to Cart"
  
  // Layout settings
  productCardStyle: "compact" | "detailed" // Default: "detailed"
  imageAspectRatio: "square" | "portrait" | "landscape" // Default: "square"
  
  // Mobile settings  
  mobileLayout: "accordion" | "tabs" | "stack" // Default: "stack"
  
  // Color settings
  accentColor?: string // For buttons and highlights
  backgroundColor?: string
  textColor?: string
}
```

---

## 🤝 Contract 7: Layout-Specific Settings

### Layout Settings Schema
```typescript
// Layout-specific structural settings (functional, not visual)
interface LayoutSettings {
  // Grid-specific settings
  gridSettings?: {
    productsPerRow: {
      mobile: 1 | 2 // Default: 2
      tablet: 2 | 3 | 4 // Default: 3
      desktop: 3 | 4 | 5 | 6 // Default: 4
    }
    enableQuickAdd: boolean // Default: true
    imagePosition: "top" | "left" // Default: "top" - changes HTML structure
  }
  
  // Slider-specific settings
  sliderSettings?: {
    slidesToShow: {
      mobile: 1 | 2 // Default: 1
      tablet: 2 | 3 // Default: 2
      desktop: 3 | 4 | 5 // Default: 4
    }
    slidesToScroll: number // Default: 1
    infiniteLoop: boolean // Default: true
    autoplay: boolean // Default: false
    autoplaySpeed: number // milliseconds, Default: 5000
    enableThumbnails: boolean // Default: false
  }
  
  // Modal-specific settings
  modalSettings?: {
    triggerType: "button" | "auto" | "exit-intent" // Default: "button"
    modalBehavior: "closeOnAdd" | "stayOpen" | "redirectToCart" // Default: "stayOpen"
    blockPageScroll: boolean // Default: true
    modalSize: "productCount" | "fixed" // Default: "fixed"
  }
  
  // Selection Box settings (Build-your-box)
  selectionSettings?: {
    selectionMode: "click" | "drag" | "both" // Default: "click"
    emptySlotBehavior: "hide" | "show" | "showGhost" // Default: "show"
    progressTracking: "counter" | "percentage" | "visual" // Default: "counter"
    selectionLimit: number // Max selections across all steps
  }
}

// Extended Bundle interface with layout settings
interface BundleWithLayoutSettings extends Bundle {
  layoutSettings?: LayoutSettings
}
```

### Update Bundle Request
```typescript
// Add to existing CreateBundleRequest and UpdateBundleRequest
interface CreateBundleRequestWithSettings extends CreateBundleRequest {
  layoutSettings?: LayoutSettings
}
```

### Layout Settings Validation
```typescript
interface LayoutSettingsValidation {
  validateGridSettings?: (settings: GridSettings) => ValidationResult
  validateSliderSettings?: (settings: SliderSettings) => ValidationResult
  validateModalSettings?: (settings: ModalSettings) => ValidationResult
  validateSelectionSettings?: (settings: SelectionSettings) => ValidationResult
}

interface ValidationResult {
  valid: boolean
  errors?: string[]
}
```

---

## 🤝 Contract 8: Bulk Bundle Operations

### Bulk Delete Bundles
```typescript
// POST /app/api/bundles/bulk-delete
interface BulkDeleteBundlesRequest {
  bundleIds: string[] // Array of bundle IDs to delete
}

interface BulkDeleteBundlesResponse {
  success: boolean
  results: Array<{
    bundleId: string
    success: boolean
    error?: string // Only present if success is false
  }>
  summary: {
    total: number
    deleted: number
    failed: number
  }
}
```

### Bulk Status Update
```typescript
// POST /app/api/bundles/bulk-status
interface BulkStatusUpdateRequest {
  bundleIds: string[] // Array of bundle IDs to update
  status: "active" | "inactive" | "draft"
}

interface BulkStatusUpdateResponse {
  success: boolean
  results: Array<{
    bundleId: string
    success: boolean
    newStatus?: Bundle['status']
    error?: string // Only present if success is false
  }>
  summary: {
    total: number
    updated: number
    failed: number
  }
}
```

### Frontend Bulk Operations Props
```typescript
// Updated BundleList Component Props for Bulk Operations
interface BundleListProps {
  bundles: Bundle[]
  pagination: ListBundlesResponse['pagination']
  onEdit: (bundleId: string) => void
  onDelete: (bundleId: string) => Promise<void>
  onStatusToggle: (bundleId: string, status: Bundle['status']) => Promise<void>
  onDuplicate: (bundleId: string, title: string, status?: Bundle['status']) => Promise<void>
  
  // New bulk operation props
  bulkOperationsEnabled?: boolean // Default: true
  selectedBundleIds?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  onBulkDelete?: (bundleIds: string[]) => Promise<BulkDeleteBundlesResponse>
  onBulkStatusUpdate?: (bundleIds: string[], status: Bundle['status']) => Promise<BulkStatusUpdateResponse>
  bulkOperationInProgress?: boolean
  loading?: boolean
  error?: string
  actionLoadingIds?: Set<string>
}

// Bulk operation status for UI feedback
interface BulkOperationStatus {
  type: 'delete' | 'status-update'
  inProgress: boolean
  progress?: {
    completed: number
    total: number
    currentOperation?: string
  }
  results?: BulkDeleteBundlesResponse | BulkStatusUpdateResponse
  error?: string
}
```

---

## ⚠️ Contract Rules

1. **NO MODIFICATIONS** without updating both agents
2. **Use exact field names** - no variations
3. **Test against contract** - not implementation
4. **Version changes** require planning agent approval