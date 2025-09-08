# Mergely Bundles - Master TODO List

## Overview
Building bundle app like Biscuits - focusing on ~40 core features that matter.

## 📁 Key Documents
- **TODO.md** - This file - master task list
- **BISCUITS_FEATURE_COMPARISON.md** - What we're actually building
- **TECHNICAL_DOCS.md** - Tech stack, schema, future APIs

---

## ✅ Phase 1: Setup & Infrastructure - DONE
- [x] Create development store
- [x] Connect app to dev store
- [x] App running locally
- [x] Define metaobject schemas in Shopify
- [ ] Vercel deployment (skip until MVP ready)

---

## 📋 Phase 2: Backend Core (Current Focus) 

### 2.1 Metaobject Schema Definition ⏱️ 2-3 hours ✅ DONE
- [x] Define Bundle metaobject in Shopify:
  - [x] Title, status, discount settings
  - [x] Layout preferences (grid/slider/modal/selection)
  - [x] Mobile-specific settings
  - [x] Steps array (JSON)
  - [x] Products array (JSON)
- [x] Create helper functions:
  - [x] createBundle()
  - [x] getBundles()
  - [x] updateBundle()
  - [x] deleteBundle()
- [x] Test metaobject operations

### 2.2 Bundle Detection & Cart Transform ⏱️ 4-5 hours ✅ DONE
- [x] Update cart transform to auto-detect bundles
- [x] Remove manual typing requirement
- [x] Implement metafield-based tracking
- [x] Support multi-step bundles
- [x] Handle partial bundles

### 2.3 Discount Engine ⏱️ 3-4 hours ✅ DONE
- [x] Percentage discounts
- [x] Fixed amount discounts
- [x] Bundle fixed price
- [ ] Volume discount tiers
- [x] Multi-currency support
- [x] Apply discounts without codes

### 2.4 Bundle Logic & Validation ⏱️ 2-3 hours ✅ MOSTLY DONE
- [x] Min/max product rules
- [x] Required step validation
- [ ] Inventory checking
- [x] Bundle availability
- [ ] Conflict handling

---

## 📋 Phase 3: Theme Integration

### 3.1 App Block Development ⏱️ 3-4 hours
- [ ] Create bundle display app block for theme integration
- [ ] Build grid/slider/modal/selection/stepper layouts in theme extension
- [x] Check which slider library to use - **DECIDED: Embla Carousel (7.67KB gzipped, no dependencies)**
- [ ] Decide which settings go in theme customizer (style settings only) vs app dashboard settings
- [ ] Determine best strategy for bundling logic in checkout and adding to cart for each layout type - consider different blocks/sections structure

### 3.2 Customer Experience ⏱️ 2-3 hours
- [ ] Add real-time price calculation
- [ ] Add combination image functionality - users upload images in app dashboard for each combination of products (2, 3, or more) and it displays in store when those specific products are selected together

#### Backend Agent Prompt:
```
Implement Combination Images functionality according to Contract 10 in AGENT_CONTRACTS.md.

Tasks:
1. Create new metaobject definition "bundle_combination" with fields:
   - products (list of product references)
   - image (file reference)
   - title (single line text, optional)

2. Update existing bundle metaobject to add:
   - combination_images (list of metaobject references to bundle_combination)

3. Create API endpoints as specified in Contract 10:
   - GET /app/api/bundles/:bundleId/combinations
   - POST /app/api/bundles/:bundleId/combinations (handle base64 image upload to Shopify Files API)
   - PUT /app/api/bundles/:bundleId/combinations/:combinationId
   - DELETE /app/api/bundles/:bundleId/combinations/:combinationId

4. Update storefront bundle endpoint to include combinations for theme display

5. Implement efficient matching logic using sorted product IDs

Important: Follow the exact types and field names in Contract 10. Test with multiple combinations across different steps.
```

#### Frontend Agent Prompt:
```
Implement Combination Images tab in Bundle Form according to Contract 10 in AGENT_CONTRACTS.md.

Tasks:
1. Add "Combination Images" tab after "Steps" tab in BundleForm component

2. Create CombinationImagesTab component that:
   - Shows all products from bundle steps organized by 2-product, 3-product sections
   - Generates possible combinations dynamically
   - Allows image upload for each combination
   - Shows preview of uploaded images
   - Handles delete/update operations

3. Create CombinationPicker component for selecting products
   - Multi-select from all bundle products
   - Shows which step each product comes from
   - Minimum 2 products required

4. Use Shopify Polaris components:
   - DropZone for image uploads
   - ResourceList for displaying combinations
   - Modal for add/edit flows

5. Convert images to base64 before sending to API

Important: Follow exact props and interfaces in Contract 10. Tab should be intuitive - users select products, upload image, save.
```

#### Theme Agent Prompt (for later):
```
Implement combination image display in theme blocks.

When customers select products in the bundle:
1. Get all selected product IDs
2. Sort them for consistent matching
3. Find matching combination using the findCombinationImage function
4. Display the combination image if found
5. Fall back to default product images if no match

Use the combinations data from StorefrontBundleWithCombinations response.
```

---

## 📋 Phase 4: Admin Interface

### 4.1 Bundle Management ⏱️ 3-4 hours ✅ DONE
- [x] Bundle creation form
- [x] Product picker
- [x] Step configuration (with tabs for Details, Rules, Layout)
- [x] Status toggle
- [x] Basic list view with search/filters

### 4.2 Settings & Configuration ⏱️ 2 hours
- [ ] Theme customization options
- [ ] Default layouts
- [ ] Currency settings
- [ ] Basic preferences

---

## 📋 Phase 5: Analytics & Polish

### 5.1 Analytics Dashboard ⏱️ 2-3 hours
- [ ] Bundle performance metrics
- [ ] Conversion tracking
- [ ] Revenue reports
- [ ] Top bundles list

### 5.2 Testing & Optimization ⏱️ 2-3 hours
- [ ] Full flow testing
- [ ] Performance optimization
- [ ] Error handling
- [ ] Mobile testing

---

## 🎯 What We're NOT Building (Yet)
- ❌ Public API
- ❌ Liquid template access
- ❌ Export functionality
- ❌ AI recommendations
- ❌ Email notifications
- ❌ Webhook configurations
- ❌ Complex customization

---

## 🔥 Quick Commands

### Development:
```bash
npm run dev              # Start local server
npm run shopify app generate extension  # Generate new extensions
```

### Testing:
```bash
# Test cart transform locally
# Test theme block in dev store
# Check mobile responsiveness
```

---

## 📝 Current Status
- **Phase 1**: ✅ Complete
- **Phase 2**: ✅ Complete (Backend Core)
- **Phase 3**: 🔄 Starting (Theme Integration)
- **Phase 4.1**: ✅ Complete (Admin Interface)
- **Next**: Theme App Block Development

---

## 💡 Remember
Focus on the ~40 features that Biscuits has. No bloat, just solid bundle functionality.