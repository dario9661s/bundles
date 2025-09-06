# Cleanup Checklist - Store-Specific & Legacy Code

## Overview
This document lists all store-specific, developer-specific, and legacy code that needs to be cleaned up before launching as a generic app.

---

## 🏬 STEP 1: Create Your Development Store (REQUIRED)

### Before doing ANY cleanup, you need your own test environment:

1. **Create Shopify Partners Account** (if you don't have one)
   - Go to: https://partners.shopify.com/signup
   - Sign up for free

2. **Create Development Store**
   - In Partners Dashboard → Stores → Add store
   - Choose "Create development store"
   - Store type: "Create a store to test and build"
   - Store name: "YourName Bundle Test Store"
   - Store URL: `your-bundle-test.myshopify.com`
   - Password: (save this!)

3. **Configure Development Store**
   - [ ] Log into your dev store
   - [ ] Add some test products (at least 10)
   - [ ] Enable test payment gateway
   - [ ] Set up basic theme (Dawn is fine)

4. **Save Store Information**
   ```bash
   # Add to your .env file:
   DEV_STORE_URL=your-bundle-test.myshopify.com
   DEV_STORE_PASSWORD=your_password_here
   ```

### Why This Is Critical:
- You'll break things during development
- Need a safe place to test cart transforms
- Required for app installation testing
- Can reset anytime if something goes wrong

---

## 📝 STEP 2: Store-Specific References to Remove

### 1. **Development Store References**
- [ ] File: `shopify.app.toml` (line 11)
  - Remove: `dev_store_url = "codelayer-test-shop-tobi.myshopify.com"`
  - Action: Delete this line entirely (it's optional)

### 2. **App URLs & Domains**
- [ ] File: `shopify.app.toml` (line 6)
  - Current: `application_url = "https://arch-gzip-edinburgh-reynolds.trycloudflare.com"`
  - Change to: Your actual app URL or use ngrok for development

- [ ] File: `shopify.app.mergely-product-bundler.toml` (line 6)
  - Current: `application_url = "https://omosa-merge-function.codelayer.dev/"`
  - Change to: Your production URL

- [ ] File: `shopify.app.toml` (lines 19-23)
  - Update all redirect URLs to match your domain

- [ ] File: `shopify.app.mergely-product-bundler.toml` (lines 17-21)
  - Update all redirect URLs to match your domain

---

## 👤 STEP 3: Developer-Specific Information

### 1. **Package.json Author**
- [ ] File: `package.json` (line 67)
  - Current: `"author": "tobiasdierich"`
  - Change to: `"author": ""` or your name

### 2. **App Name Consistency**
- [ ] File: `package.json` (line 2)
  - Current: `"name": "omosa-merge-function"`
  - Change to: `"name": "mergely-product-bundler"`

- [ ] File: `shopify.app.toml` (line 4)
  - Current: `name = "omosa-merge-function-dev"`
  - Change to: `name = "mergely-product-bundler-dev"`

- [ ] File: `shopify.app.toml` (line 5)
  - Current: `handle = "omosa-merge-function-dev"`
  - Change to: `handle = "mergely-product-bundler-dev"`

---

## 🔑 STEP 4: App Registration & API Keys

### 1. **Client IDs** (Need new app registration)
- [ ] File: `shopify.app.toml` (line 3)
  - Current: `client_id = "b4792aa4a0204428b3a0162e4e3db103"`
  - Change to: Your dev app client ID

- [ ] File: `shopify.app.mergely-product-bundler.toml` (line 3)
  - Current: `client_id = "06be95de2a53f680adf9f4eea00c9275"`
  - Change to: Your production app client ID

---

## 🌍 STEP 5: Environment Variables

### 1. **Create `.env.example` file with:**
```bash
# Development Store (from STEP 1)
DEV_STORE_URL=your-bundle-test.myshopify.com
DEV_STORE_PASSWORD=your_password_here

# Shopify App Configuration
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SCOPES=read_products,write_cart_transforms
SHOPIFY_APP_URL=https://your-app-url.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mergely

# Cart Transform Function (REQUIRED)
CART_TRANSFORM_FUNCTION_ID=your_function_id_here

# Optional: Custom domain
SHOP_CUSTOM_DOMAIN=

# Redis (for production)
REDIS_URL=redis://localhost:6379

# Monitoring (optional)
SENTRY_DSN=
```

### 2. **Update `.gitignore` to include:**
```
.env
.env.local
.env.production
shopify.app.*.toml
!shopify.app.toml
```

---

## 🔧 Code Updates Needed

### 1. **Extension Name**
- [ ] File: `extensions/merge-cart-transformer/locales/en.default.json`
  - Check for any "omosa" references
  - Update to "Mergely" branding

### 2. **Database Migrations**
- [ ] Review migration files for any hardcoded values
- [ ] Ensure migrations are generic

### 3. **Function IDs**
- [ ] File: `app/shopify.server.ts` (line 32)
  - Confirms it uses: `process.env.CART_TRANSFORM_FUNCTION_ID`
  - ✅ Already generic - just needs env var

---

## 📝 Documentation Updates

### 1. **README.md**
- [ ] Remove any specific store references
- [ ] Update setup instructions
- [ ] Add environment variable documentation
- [ ] Remove any "omosa" references

### 2. **CHANGELOG.md**
- [ ] Start fresh or clean history

---

## 🚀 Pre-Launch Checklist

### Before First Deploy:
1. [ ] Register new Shopify app (dev + production)
2. [ ] Get new API keys and client IDs
3. [ ] Set up fresh database
4. [ ] Configure all environment variables
5. [ ] Update all URLs to your domain
6. [ ] Remove all "omosa" references
7. [ ] Remove all "codelayer" references
8. [ ] Remove all "tobias/tobi" references

### Quick Commands:
```bash
# Find all omosa references
grep -r "omosa" --exclude-dir=node_modules .

# Find all codelayer references  
grep -r "codelayer" --exclude-dir=node_modules .

# Find all tobias/tobi references
grep -r -i "tobi" --exclude-dir=node_modules .

# Update package name
sed -i '' 's/omosa-merge-function/mergely-product-bundler/g' package.json

# Remove author
sed -i '' 's/"author": "tobiasdierich"/"author": ""/g' package.json
```

---

## ⚠️ Critical Items

1. **MUST create new Shopify app registration** - Current client IDs are tied to original developer
2. **MUST set CART_TRANSFORM_FUNCTION_ID** - App won't work without this
3. **MUST update all URLs** - Current URLs won't work for your deployment
4. **SHOULD remove dev_store_url** - It's pointing to someone else's store

---

## 🎯 Estimated Time: 1-2 hours

Most of this is configuration changes. The actual code is already quite generic!