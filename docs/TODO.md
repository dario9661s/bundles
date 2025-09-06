# Adsgun Bundles - Master TODO List

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
- [ ] Define metaobject schemas in Shopify
- [ ] Vercel deployment (skip until MVP ready)

---

## 📋 Phase 2: Backend Core (Current Focus) 

### 2.1 Metaobject Schema Definition ⏱️ 2-3 hours
- [ ] Define Bundle metaobject in Shopify:
  - [ ] Title, status, discount settings
  - [ ] Layout preferences (grid/slider/portrait/landscape)
  - [ ] Mobile-specific settings
  - [ ] Steps array (JSON)
  - [ ] Products array (JSON)
- [ ] Create helper functions:
  - [ ] createBundle()
  - [ ] getBundles()
  - [ ] updateBundle()
  - [ ] deleteBundle()
- [ ] Test metaobject operations

### 2.2 Bundle Detection & Cart Transform ⏱️ 4-5 hours
- [ ] Update cart transform to auto-detect bundles
- [ ] Remove manual typing requirement
- [ ] Implement metafield-based tracking
- [ ] Support multi-step bundles
- [ ] Handle partial bundles

### 2.3 Discount Engine ⏱️ 3-4 hours
- [ ] Percentage discounts
- [ ] Fixed amount discounts
- [ ] Bundle fixed price
- [ ] Volume discount tiers
- [ ] Multi-currency support
- [ ] Apply discounts without codes

### 2.4 Bundle Logic & Validation ⏱️ 2-3 hours
- [ ] Min/max product rules
- [ ] Required step validation
- [ ] Inventory checking
- [ ] Bundle availability
- [ ] Conflict handling

---

## 📋 Phase 3: Theme Integration

### 3.1 App Block Development ⏱️ 3-4 hours
- [ ] Create bundle display block
- [ ] Portrait/landscape card templates
- [ ] Grid/slider layouts
- [ ] Accordion layout
- [ ] Mobile responsive settings

### 3.2 Customer Experience ⏱️ 2-3 hours
- [ ] Visual product selection (no typing!)
- [ ] Step-by-step flow
- [ ] Real-time price calculation
- [ ] Add bundle to cart
- [ ] Show savings amount

---

## 📋 Phase 4: Admin Interface

### 4.1 Bundle Management ⏱️ 3-4 hours
- [ ] Bundle creation form
- [ ] Product picker
- [ ] Step configuration
- [ ] Status toggle
- [ ] Basic list view

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
- **Phase 2**: 🔄 In Progress (Backend Core)
- **Next**: Database schema creation

---

## 💡 Remember
Focus on the ~40 features that Biscuits has. No bloat, just solid bundle functionality.