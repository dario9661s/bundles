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
- [ ] Create bundle display block
- [ ] Card templates
- [ ] Grid/slider/modal/selection layouts
- [x] Accordion layout (implemented as visual option)
- [ ] Mobile responsive settings

### 3.2 Customer Experience ⏱️ 2-3 hours
- [ ] Visual product selection (no typing!)
- [ ] Step-by-step flow
- [ ] Real-time price calculation
- [ ] Add bundle to cart
- [ ] Show savings amount

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