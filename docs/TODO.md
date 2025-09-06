# Mergely Product Bundler - Master TODO List

## Overview
Building Mergely with proven, reliable technologies. Timeline: 2-3 weeks with 4-agent workflow.

## 📁 Key Documents
- **API_SPEC.md** - API contract (backend/frontend agreement)
- **SPRINT_PLAN.md** - Day-by-day development plan
- **FEATURES_CHECKLIST.md** - Simple progress tracking
- **AGENT_*.md** - Instructions for each AI agent

---

## 📋 Phase 1: Setup & Infrastructure (Day 1-2)
**Goal:** Get core infrastructure running with test store

### 1.1 Development Store ✅ DONE
- [x] Create Shopify Partners account
- [x] Create development store
- [x] Add test products

### 1.2 Infrastructure Setup ⏱️ 2 hours
- [ ] Set up Supabase account
  - [ ] Create new project
  - [ ] Get connection string
  - [ ] Update DATABASE_URL in .env
- [ ] Run database migrations
  - [ ] `npx prisma migrate dev`
  - [ ] Verify tables created
- [ ] Set up Vercel account
  - [ ] Connect GitHub repo
  - [ ] Configure environment variables
  - [ ] Test deployment

### 1.3 Local Development ⏱️ 1 hour
- [ ] Clone repository
- [ ] Install dependencies: `npm install`
- [ ] Copy `.env.example` to `.env`
- [ ] Update Shopify credentials
- [ ] Run locally: `npm run dev`
- [ ] Test app installation on dev store

---

## 📋 Phase 2: Core Features (Week 1)
**Goal:** Build essential bundle functionality

### 2.1 Bundle Configuration CRUD ⏱️ 3-4 hours
- [ ] Create bundle model updates
- [ ] Build API routes:
  - [ ] GET /api/bundles - list all
  - [ ] POST /api/bundles - create
  - [ ] PUT /api/bundles/:id - update
  - [ ] DELETE /api/bundles/:id - delete
- [ ] Add validation with Zod
- [ ] Test with Postman/Insomnia

### 2.2 Cart Transform Integration ⏱️ 4-5 hours
- [ ] Port cart transform logic
- [ ] Create cart transform function
- [ ] Register with Shopify
- [ ] Test with real cart data
- [ ] Handle edge cases

### 2.3 Pricing Engine ⏱️ 4-5 hours
- [ ] Build price calculator
- [ ] Support discount types:
  - [ ] Percentage off
  - [ ] Fixed amount off
  - [ ] Bundle fixed price
- [ ] Multi-currency support
- [ ] Tax calculations

### 2.4 Inventory Management ⏱️ 3-4 hours
- [ ] Check product availability
- [ ] Prevent overselling
- [ ] Out-of-stock handling
- [ ] Inventory webhooks

---

## 📋 Phase 3: Frontend UI (Week 1-2)
**Goal:** Build admin interface

### 3.1 Bundle List Page ⏱️ 4 hours
- [ ] IndexTable with Polaris
- [ ] Search and filters
- [ ] Bulk actions
- [ ] Pagination

### 3.2 Bundle Create/Edit ⏱️ 4 hours
- [ ] Product picker component
- [ ] Discount configuration
- [ ] Preview panel
- [ ] Form validation

### 3.3 Analytics Dashboard ⏱️ 4 hours
- [ ] Chart.js integration
- [ ] Revenue metrics
- [ ] Popular bundles
- [ ] Conversion rates

### 3.4 Settings Page ⏱️ 2 hours
- [ ] Global configurations
- [ ] Theme instructions
- [ ] Help documentation

---

## 📋 Phase 4: Analytics & Automation (Week 2)
**Goal:** Add reporting and automation

### 4.1 Analytics Setup ⏱️ 2 hours
- [ ] Create analytics schema
- [ ] Track bundle events
- [ ] Build reporting queries

### 4.2 n8n Integration ⏱️ 3 hours
- [ ] Install n8n locally/cloud
- [ ] Create webhook endpoints
- [ ] Build workflows:
  - [ ] Daily reports
  - [ ] Google Sheets sync
  - [ ] Email summaries
  - [ ] Error alerts

### 4.3 Export Features ⏱️ 2 hours
- [ ] CSV export endpoint
- [ ] Report generation
- [ ] Scheduled exports via n8n

---

## 📋 Phase 5: Testing & Launch (Week 2-3)
**Goal:** Production-ready app

### 5.1 Testing ⏱️ 4 hours
- [ ] Unit tests for API
- [ ] Integration tests
- [ ] Load testing
- [ ] Security audit

### 5.2 Production Setup ⏱️ 3 hours
- [ ] Configure Vercel production
- [ ] Set up error tracking (Sentry)
- [ ] Configure monitoring
- [ ] Set up backups

### 5.3 Beta Testing ⏱️ 3-4 days
- [ ] Find 5-10 testers
- [ ] Monitor errors
- [ ] Fix critical bugs
- [ ] Gather feedback

### 5.4 App Store Submission ⏱️ 2 hours
- [ ] Create app listing
- [ ] Add screenshots
- [ ] Write description
- [ ] Submit for review

---

## 🎯 3-Agent Workflow

### Current Progress:
- **Agent 0 (Planning)**: This chat - architecture & coordination
- **Agent 1 (Dev)**: Ready to build features
- **Agent 2 (QA)**: Ready to test code
- **Agent 3 (Deploy)**: Ready for deployment

### Daily Workflow:
1. Planning Agent specs feature (updates API_SPEC.md)
2. Dev Agent implements per spec
3. QA Agent tests implementation
4. Dev Agent fixes any issues
5. Deploy Agent pushes to staging
6. Planning Agent verifies and plans next feature

---

## 📊 Progress Tracking

### Completed: 1/40 tasks
### Current Phase: Infrastructure Setup
### Estimated Completion: 2-3 weeks

### Week 1 Goals:
- ✅ Dev store setup
- [ ] Infrastructure ready
- [ ] Core CRUD working
- [ ] Cart transform live
- [ ] Basic UI complete

### Week 2 Goals:
- [ ] Full UI complete
- [ ] Analytics working
- [ ] n8n automated
- [ ] Beta testing started

### Week 3 Goals:
- [ ] Bugs fixed
- [ ] App submitted
- [ ] Launch ready

---

## 🔥 Quick Commands

### Development:
```bash
npm run dev              # Start local server
npm run build           # Build for production
npm run preview         # Preview production build
npx prisma studio       # View database
npx prisma migrate dev  # Run migrations
```

### Deployment:
```bash
vercel                  # Deploy to staging
vercel --prod          # Deploy to production
```

### Testing:
```bash
npm test               # Run tests
npm run test:e2e      # End-to-end tests
```

---

## 📝 Notes

### Tech Stack Confirmed:
- ✅ Remix + React
- ✅ Supabase (PostgreSQL)
- ✅ Vercel hosting
- ✅ n8n automation
- ✅ Shopify Polaris UI

### Next Priority:
1. Set up Supabase (15 mins)
2. Set up Vercel (30 mins)
3. Start Day 2 of SPRINT_PLAN.md (Bundle CRUD)

### How to Use This:
1. Check SPRINT_PLAN.md for today's tasks
2. Reference API_SPEC.md for implementation details
3. Update FEATURES_CHECKLIST.md as you complete items

---

Remember: Simple, reliable tools that work! 🚀