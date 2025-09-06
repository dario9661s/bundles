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

## ⚠️ Contract Rules

1. **NO MODIFICATIONS** without updating both agents
2. **Use exact field names** - no variations
3. **Test against contract** - not implementation
4. **Version changes** require planning agent approval