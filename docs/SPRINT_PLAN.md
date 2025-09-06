# Mergely Sprint Plan - Backend First Approach

## Overview
Backend-first development: APIs ready → Frontend consumes → Clean separation

---

## Week 1: Backend Core (No UI Needed)

### Day 1: Foundation & Infrastructure Setup
**Morning: Get Existing App Running**
- [x] Dev store created
- [ ] Clone repository & install dependencies (15 mins)
- [ ] Configure .env file with Shopify credentials
- [ ] Run app locally: `npm run dev`
- [ ] Fix any startup errors
- [ ] Verify connection to dev store
- [ ] Test basic app installation flow

**Afternoon: Clean Up Legacy Code**
- [ ] Review existing MergeConfiguration implementation
- [ ] Remove unused routes and components
- [ ] Clean up CartTransform legacy code
- [ ] Document what each existing file does
- [ ] Check CLEANUP_CHECKLIST.md for guidance

**End of Day: Infrastructure Setup**
- [ ] Supabase setup (15 mins)
- [ ] Database migrations (15 mins)
- [ ] Vercel deployment (30 mins)
- [ ] Environment variables configured

### Day 2: Bundle CRUD API
**Morning: Database & Models**
- [ ] Update Prisma schema for bundles
- [ ] Add bundle_products join table
- [ ] Run migrations
- [ ] Create Prisma client methods

**Afternoon: API Endpoints**
- [ ] POST /api/bundles (create)
- [ ] GET /api/bundles (list with pagination)
- [ ] GET /api/bundles/:id (single bundle)
- [ ] PUT /api/bundles/:id (update)
- [ ] DELETE /api/bundles/:id (delete)

**Testing:** Postman/Insomnia

### Day 3: Cart Transform Logic
**Morning: Core Logic**
- [ ] Port existing cart transform code
- [ ] Create /api/cart-transform/process endpoint
- [ ] Add metafield management

**Afternoon: Shopify Integration**
- [ ] Register cart transform function
- [ ] Test with real cart data
- [ ] Handle edge cases

### Day 4: Pricing & Inventory
**Morning: Pricing Engine**
- [ ] POST /api/bundles/:id/calculate-price
- [ ] Support percentage/fixed/bundle pricing
- [ ] Multi-currency calculations

**Afternoon: Inventory**
- [ ] POST /api/inventory/check
- [ ] Webhook for inventory updates
- [ ] Stock validation logic

### Day 5: Analytics & n8n
**Morning: Analytics Endpoints**
- [ ] GET /api/analytics/bundles/:id
- [ ] POST /api/analytics/export
- [ ] Event tracking system

**Afternoon: n8n Integration**
- [ ] POST /api/webhooks/analytics
- [ ] POST /api/webhooks/error
- [ ] Test n8n workflows

---

## Week 2: Frontend & Polish

### Day 6-7: Admin UI Foundation
- [ ] Bundle list page (IndexTable)
- [ ] Bundle create/edit form
- [ ] Product picker component
- [ ] Form validation

### Day 8-9: Analytics Dashboard
- [ ] Chart components
- [ ] Metrics display
- [ ] Export functionality
- [ ] Date range filters

### Day 10: Integration & Testing
- [ ] Connect all UI to APIs
- [ ] End-to-end testing
- [ ] Bug fixes
- [ ] Performance optimization

---

## Week 3: Launch Preparation

### Day 11-12: Beta Testing
- [ ] Deploy to production
- [ ] Find beta testers
- [ ] Monitor errors
- [ ] Gather feedback

### Day 13-14: Polish & Submit
- [ ] Fix critical bugs
- [ ] Update documentation
- [ ] Create app listing
- [ ] Submit to Shopify

---

## 📊 Backend Milestones

### ✅ Day 2 Success Criteria:
- All CRUD endpoints working
- Tested with Postman
- No frontend needed

### ✅ Day 3 Success Criteria:
- Cart transform working
- Bundles merge in checkout
- Metafields saved

### ✅ Day 4 Success Criteria:
- Pricing calculations accurate
- Inventory checks working
- All currencies supported

### ✅ Day 5 Success Criteria:
- Analytics tracking events
- n8n receiving webhooks
- Reports generating

---

## 🔧 Daily Workflow

### Morning Standup (with yourself):
1. Check SPRINT_PLAN.md for today's tasks
2. Review API_SPEC.md for endpoint details
3. Open Dev Agent for implementation

### Implementation Flow:
1. Planning Agent → Updates specs
2. Dev Agent → Implements feature
3. QA Agent → Tests implementation
4. Deploy Agent → Pushes to staging

### End of Day:
1. Update progress in SPRINT_PLAN.md
2. Commit working code
3. Plan tomorrow's tasks

---

## 🚀 Key Principles

1. **Backend First**: Every feature starts with API
2. **No UI Dependencies**: Backend fully testable without frontend
3. **API Contract**: API_SPEC.md is the source of truth
4. **Daily Progress**: Something deployable every day
5. **Test Early**: QA Agent involved daily

---

## 📝 Notes

- Prioritize getting APIs working over perfect code
- Frontend can be built rapidly once APIs are solid
- n8n handles non-critical features (reports, emails)
- Keep it simple - we're building an MVP