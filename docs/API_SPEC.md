# Mergely Bundle App - API Specification

## Overview
This document defines the contract between Backend and Frontend. All endpoints, request/response formats, and examples are documented here.

---

## 🔐 Authentication
All API requests require Shopify session authentication via `shopify.authenticate.admin(request)`

---

## 📦 Bundle Endpoints

### List All Bundles
```
GET /api/bundles
```

**Response:**
```json
{
  "bundles": [
    {
      "id": 1,
      "shop": "example.myshopify.com",
      "title": "Summer Bundle",
      "description": "3 summer essentials",
      "status": "active",
      "discountType": "percentage",
      "discountValue": 15,
      "minQuantity": 1,
      "maxQuantity": 10,
      "lineItemProperty": "_bundle_summer2024",
      "metafieldKey": "custom.bundle_summer",
      "products": [
        {
          "id": "gid://shopify/Product/123",
          "quantity": 1,
          "position": 1
        }
      ],
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

### Get Single Bundle
```
GET /api/bundles/:id
```

**Response:**
```json
{
  "bundle": {
    "id": 1,
    "shop": "example.myshopify.com",
    "title": "Summer Bundle",
    "description": "3 summer essentials",
    "status": "active",
    "discountType": "percentage",
    "discountValue": 15,
    "minQuantity": 1,
    "maxQuantity": 10,
    "lineItemProperty": "_bundle_summer2024",
    "metafieldKey": "custom.bundle_summer",
    "products": [
      {
        "id": "gid://shopify/Product/123",
        "quantity": 1,
        "position": 1,
        "productData": {
          "title": "Summer Hat",
          "price": "29.99",
          "image": "https://...",
          "availableQuantity": 100
        }
      }
    ],
    "analytics": {
      "views": 1250,
      "conversions": 89,
      "revenue": 4521.50
    }
  }
}
```

### Create Bundle
```
POST /api/bundles
```

**Request:**
```json
{
  "title": "Winter Bundle",
  "description": "Essential winter items",
  "status": "active",
  "discountType": "fixed",
  "discountValue": 20,
  "minQuantity": 1,
  "maxQuantity": 5,
  "products": [
    {
      "id": "gid://shopify/Product/123",
      "quantity": 1,
      "position": 1
    },
    {
      "id": "gid://shopify/Product/456",
      "quantity": 2,
      "position": 2
    }
  ]
}
```

**Response:**
```json
{
  "bundle": {
    "id": 2,
    "lineItemProperty": "_bundle_winter2024_2",
    "metafieldKey": "custom.bundle_winter_2",
    // ... all bundle fields
  },
  "success": true
}
```

### Update Bundle
```
PUT /api/bundles/:id
```

**Request:** Same as create, partial updates supported

**Response:** Same as create

### Delete Bundle
```
DELETE /api/bundles/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Bundle deleted successfully"
}
```

### Duplicate Bundle
```
POST /api/bundles/:id/duplicate
```

**Response:** Same as create with new ID

---

## 💰 Pricing Endpoints

### Calculate Bundle Price
```
POST /api/bundles/:id/calculate-price
```

**Request:**
```json
{
  "items": [
    {
      "productId": "gid://shopify/Product/123",
      "variantId": "gid://shopify/ProductVariant/456",
      "quantity": 2
    }
  ],
  "currency": "USD"
}
```

**Response:**
```json
{
  "pricing": {
    "originalPrice": 149.99,
    "discountAmount": 22.50,
    "finalPrice": 127.49,
    "currency": "USD",
    "savingsPercentage": 15,
    "priceBreakdown": [
      {
        "productId": "gid://shopify/Product/123",
        "unitPrice": 74.99,
        "quantity": 2,
        "subtotal": 149.99
      }
    ]
  }
}
```

---

## 📊 Analytics Endpoints

### Bundle Performance
```
GET /api/analytics/bundles/:id
```

**Query Parameters:**
- `startDate`: ISO date string
- `endDate`: ISO date string
- `metrics`: comma-separated (views,conversions,revenue)

**Response:**
```json
{
  "analytics": {
    "summary": {
      "totalViews": 5420,
      "totalConversions": 342,
      "conversionRate": 6.31,
      "totalRevenue": 43521.50,
      "averageOrderValue": 127.14
    },
    "daily": [
      {
        "date": "2024-01-01",
        "views": 234,
        "conversions": 15,
        "revenue": 1905.50
      }
    ]
  }
}
```

### Export Analytics
```
POST /api/analytics/export
```

**Request:**
```json
{
  "format": "csv",
  "dateRange": "last_30_days",
  "metrics": ["views", "conversions", "revenue"]
}
```

**Response:**
```json
{
  "exportUrl": "/api/analytics/download/export_2024_01_01.csv",
  "expiresAt": "2024-01-02T00:00:00Z"
}
```

---

## 🔄 Cart Transform Endpoints

### Process Cart Transform
```
POST /api/cart-transform/process
```

**Request:** (From Shopify Function)
```json
{
  "cart": {
    "lines": [
      {
        "id": "line1",
        "merchandise": {
          "id": "gid://shopify/ProductVariant/123",
          "product": {
            "title": "Product A"
          }
        },
        "quantity": 1,
        "lineItemProperty1": {
          "value": "_bundle_summer2024"
        }
      }
    ]
  },
  "shop": "example.myshopify.com"
}
```

**Response:**
```json
{
  "operations": [
    {
      "merge": {
        "cartLines": [
          {
            "cartLineId": "line1",
            "quantity": 1
          },
          {
            "cartLineId": "line2",
            "quantity": 1
          }
        ],
        "title": "Summer Bundle",
        "parentVariantId": "gid://shopify/ProductVariant/123"
      }
    }
  ]
}
```

---

## 📦 Inventory Endpoints

### Check Bundle Availability
```
POST /api/inventory/check
```

**Request:**
```json
{
  "bundleId": 1,
  "items": [
    {
      "productId": "gid://shopify/Product/123",
      "quantity": 2
    }
  ]
}
```

**Response:**
```json
{
  "available": true,
  "items": [
    {
      "productId": "gid://shopify/Product/123",
      "requestedQuantity": 2,
      "availableQuantity": 150,
      "inStock": true
    }
  ],
  "message": "All items available"
}
```

---

## 🛠️ Utility Endpoints

### Health Check
```
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Sync Metafields
```
POST /api/bundles/:id/sync-metafields
```

**Response:**
```json
{
  "success": true,
  "metafieldId": "gid://shopify/Metafield/123",
  "message": "Metafields synced successfully"
}
```

---

## 🚨 Error Responses

All endpoints return consistent error format:

```json
{
  "error": true,
  "message": "Human readable error message",
  "code": "BUNDLE_NOT_FOUND",
  "details": {
    // Additional context
  },
  "statusCode": 404
}
```

### Common Error Codes:
- `BUNDLE_NOT_FOUND` - 404
- `VALIDATION_ERROR` - 400
- `UNAUTHORIZED` - 401
- `SHOP_MISMATCH` - 403
- `INTERNAL_ERROR` - 500
- `INVENTORY_INSUFFICIENT` - 409

---

## 🔄 Webhook Endpoints (n8n Integration)

### Analytics Webhook
```
POST /api/webhooks/analytics
```

**Purpose:** Send events to n8n for processing

**Request:**
```json
{
  "event": "bundle_viewed",
  "bundleId": 1,
  "timestamp": "2024-01-01T00:00:00Z",
  "metadata": {
    // Event-specific data
  }
}
```

### Error Webhook
```
POST /api/webhooks/error
```

**Purpose:** Forward errors to n8n for monitoring

---

## 📝 Notes

1. All endpoints require Shopify session authentication
2. Pagination uses `page` and `limit` query parameters
3. All timestamps are ISO 8601 format in UTC
4. Product IDs are Shopify GIDs
5. Monetary values are in cents (multiply by 100)