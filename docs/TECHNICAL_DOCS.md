# Adsgun Bundles Technical Documentation

## 🎯 Current Tech Stack

### Core Technologies:
- **Backend**: Remix + Node.js (existing codebase)
- **Data Storage**: Shopify Metaobjects (no external database!)
- **Hosting**: Vercel (deploy after MVP)
- **UI**: Shopify Polaris + React
- **Cart Transform**: Shopify Functions

### Current Focus: Predefined Templates Approach
- App Blocks for theme integration
- Predefined layouts (no custom code for users)
- Visual bundle builder
- No public API (yet)

---

## 📋 Phase 1: MVP Features (What We're Building Now)

### Metaobject Schema:
```graphql
# Define in Shopify Partner Dashboard
type adsgun_bundle {
  title: single_line_text_field!
  status: single_line_text_field! # active/inactive
  discount_type: single_line_text_field! # percentage/fixed/total
  discount_value: number_decimal!
  layout_type: single_line_text_field! # grid/slider/portrait/landscape
  mobile_columns: number_integer!
  desktop_columns: number_integer!
  steps: json! # Array of step configurations
  products: json! # Array of product GIDs
}
```

### Helper Functions:
```javascript
// Create bundle
export async function createBundle(admin, bundleData) {
  return await admin.graphql(`
    mutation {
      metaobjectCreate(
        metaobject: {
          type: "adsgun_bundle"
          fields: ${JSON.stringify(bundleData)}
        }
      ) {
        metaobject { id handle }
      }
    }
  `);
}

// Get bundles
export async function getBundles(admin, shop) {
  const response = await admin.graphql(`
    query {
      metaobjects(type: "adsgun_bundle", first: 250) {
        nodes {
          id
          handle
          fields { key value }
        }
      }
    }
  `);
  return parseBundles(response);
}
```

### Cart Transform Logic:
- Auto-detect bundle items (no manual typing)
- Use metafields for bundle tracking
- Apply discounts automatically
- Support multi-step bundles

### Theme Integration:
- App Block with predefined templates
- Mobile responsive by default
- No custom CSS/Liquid for merchants
- ~25 customization options in theme editor

---

## 📋 Phase 2: Future API & Customization

### When We Add APIs (Later):
```typescript
// Bundle Management APIs
GET    /api/bundles          // List all bundles
POST   /api/bundles          // Create bundle
GET    /api/bundles/:id      // Get single bundle
PUT    /api/bundles/:id      // Update bundle
DELETE /api/bundles/:id      // Delete bundle

// Analytics APIs
GET    /api/analytics/bundles/:id
POST   /api/analytics/export

// Pricing APIs
POST   /api/bundles/:id/calculate-price
POST   /api/inventory/check
```

### Advanced Features (Phase 2):
- CSS customization panel
- Advanced template editor
- Developer API access
- Liquid template support (premium)
- Webhook integrations
- n8n automation workflows

---

## 🚀 Deployment & Infrastructure

### Local Development:
```bash
npm run dev              # Start dev server
npm run shopify app info # View app info
```

### Production (After MVP):
- Deploy to Vercel
- Environment variables setup
- Error tracking (Sentry)
- Performance monitoring
- Metaobject cleanup on uninstall

---

## 💰 Cost Breakdown

### Current (Development):
- Data Storage: $0 (Shopify metaobjects)
- Vercel: $0 (not deployed yet)
- Total: $0/month

### Production:
- Data Storage: $0 (included with Shopify)
- Vercel: $0-20
- Total: $0-20/month

---

## 🔧 What We're NOT Building (MVP):
- Public API endpoints
- Webhook configurations
- Complex customization options
- Export/import functionality
- Email notifications
- AI features
- Multiple bundle types (just mix & match)

---

## 📝 Notes

### Why This Approach:
1. **Predefined templates** = Faster development
2. **No custom code** = Less support burden
3. **Visual builder** = Better UX
4. **App Blocks** = Easy theme integration

### Future Expansion:
When we add API/customization features, they'll be:
- Premium tier features
- Progressive enhancement
- Backward compatible
- Optional for merchants

---

## 🗑️ Data Cleanup on Uninstall

### Webhook Handler:
```javascript
// app/routes/webhooks.app.uninstalled.tsx
export async function action({ request }) {
  const { shop, admin, topic } = await authenticate.webhooks(request);
  
  if (topic === "APP_UNINSTALLED") {
    // Delete all bundle metaobjects
    await admin.graphql(`
      mutation {
        metaobjectBulkDelete(
          where: { 
            type: "adsgun_bundle"
          }
        ) {
          deletedCount
        }
      }
    `);
    
    // Clean up any other data
    await cleanupShopData(shop);
  }
  
  return new Response();
}
```

### Clean Uninstall Benefits:
- ✅ No data left behind
- ✅ GDPR compliant
- ✅ Clean reinstalls
- ✅ No storage costs after uninstall