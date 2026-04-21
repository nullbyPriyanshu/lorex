# Lorex CLI - Next.js Optimization - Complete Usage Guide

## Quick Start

### Installation
```bash
# Install globally
npm install -g lorex-cli

# Or use it directly in the project
npx lorex-cli@latest init
```

### Basic Usage
```bash
# Create documentation for your Next.js project
lorex init

# When prompted, describe your project:
# "Full-stack e-commerce platform with real-time order tracking and Next.js 14"

# Copy to clipboard for sharing with AI
lorex copy

# View in terminal
lorex show

# Keep it updated as your project evolves
lorex update

# See what changed since last scan
lorex diff
```

## 8 Sections Explained

### Section 1: Routes & API Endpoints

**What it captures:**
- Every page route in `/app` directory
- Every API route in `/app/api/` with HTTP methods
- Request body fields extracted from handlers
- Middleware configuration and matchers

**Example for an e-commerce app:**
```
## 1. Routes & API Endpoints

### Page Routes
- `/` (home)
- `/products` (product listing)
- `/products/[id]` (product detail)
- `/cart` (shopping cart)
- `/checkout` (checkout flow)
- `/orders` (order history)
- `/admin` (admin dashboard)

### API Routes
- `/api/products` → GET, POST (body: name, price, category, description)
- `/api/products/[id]` → GET, PUT, DELETE
- `/api/products/[id]/reviews` → GET, POST (body: rating, comment, userId)
- `/api/cart` → GET, POST (body: productId, quantity)
- `/api/cart/[id]` → PUT, DELETE
- `/api/checkout` → POST (body: cartId, shippingAddress, paymentMethod)
- `/api/orders` → GET (returns: all orders for user)
- `/api/orders/[id]` → GET, PUT (body: status)
- `/api/auth/register` → POST (body: email, password, name)
- `/api/auth/login` → POST (body: email, password)
- `/api/auth/logout` → POST
- `/api/auth/profile` → GET, PUT (body: name, email, phone)

### Middleware
- **File:** `middleware.ts`
- **Matchers:** `/api/*`, `/admin/*`, `/checkout/*`
```

**How to use with AI:**
- Paste this into Claude/ChatGPT to get exact API specifications
- Ask for database schema that supports these endpoints
- Request code generation for missing endpoints
- Get validation schemas for request bodies

### Section 2: File & Folder Tree (App Router)

**What it shows:**
- Complete `/app` directory structure
- Route groups like (auth), (dashboard) properly marked
- Special files distinguished: page, layout, route, error, loading, not-found
- Clean hierarchy showing nested routes

**Example:**
```
## 2. File & Folder Tree (App Router)

├── (auth) [GROUP]
│   ├── login
│   │   └── page
│   ├── register
│   │   └── page
│   └── layout
├── (dashboard) [GROUP]
│   ├── layout
│   ├── page
│   ├── analytics
│   │   └── page
│   └── settings
│       ├── page
│       └── layout
├── api
│   ├── auth
│   │   └── [...nextauth]
│   │       └── route
│   ├── products
│   │   ├── [id]
│   │   │   ├── route
│   │   │   └── reviews
│   │   │       └── route
│   │   └── route
│   ├── orders
│   │   ├── [id]
│   │   │   └── route
│   │   └── route
│   └── checkout
│       └── route
├── components
│   ├── ProductCard.tsx
│   ├── Cart.tsx
│   └── Navigation.tsx
├── layout
├── page
├── error
├── not-found
└── loading
```

**How to use with AI:**
- Ask for component scaffolding for missing routes
- Request refactoring suggestions for organization
- Get performance optimization advice for structure

### Section 3: Packages & Dependencies

**What it shows:**
- All dependencies grouped by purpose (7 categories)
- Version numbers for reference
- Easy identification of your tech stack

**Example:**
```
## 3. Packages & Dependencies

### UI & Styling
- next `14.0.0`
- react `18.2.0`
- react-dom `18.2.0`
- tailwindcss `3.3.0`
- shadcn-ui `0.5.0`
- framer-motion `10.16.4`

### Database
- @prisma/client `5.0.0`
- postgresql `15.0.0`

### Authentication
- next-auth `4.23.0`
- bcryptjs `2.4.3`

### State Management
- zustand `4.4.0`
- @tanstack/react-query `5.0.0`

### Testing
- jest `29.7.0`
- @testing-library/react `14.0.0`
- playwright `1.40.0`

### Tooling & Build
- typescript `5.2.2`
- eslint `8.50.0`
- prettier `3.0.3`
- vite `5.0.0`

### Other
- axios `1.6.0`
- dotenv `16.3.1`
- nodemailer `6.9.6`
```

**How to use with AI:**
- Ask for security vulnerabilities in your stack
- Get performance optimization recommendations
- Request upgrade paths for dependencies
- Get code patterns for popular libraries you're using

### Section 4: Authentication

**What it detects:**
- NextAuth.js configuration with providers
- Clerk setup
- Custom auth implementations
- Session strategy (JWT or Database)

**Example:**
```
## 4. Authentication

**Type:** NextAuth.js v4

**Providers:**
- GitHub OAuth
- Google OAuth
- Credentials (email/password)

**Session Strategy:** JWT

**Config Files:**
- `app/api/auth/[...nextauth]/route.ts`
```

**How to use with AI:**
- Ask for additional provider setup (Discord, LinkedIn, etc.)
- Request middleware implementation for protected routes
- Get code for role-based access control
- Ask for session refresh logic

### Section 5: Last 5 Git Commits

**What it shows:**
- Recent project activity
- Commit messages and timestamps
- Helps AI understand recent changes

**Example:**
```
## 5. Last 5 Git Commits

- `a1f2c3d` · Implement checkout page with Stripe integration · 2024-04-21
- `b2e3f4g` · Add product filtering and search · 2024-04-20
- `c3f4g5h` · Refactor auth middleware · 2024-04-19
- `d4g5h6i` · Add product image upload · 2024-04-18
- `e5h6i7j` · Initial Next.js 14 setup with Tailwind · 2024-04-17
```

**How to use with AI:**
- Ask for review of recent code changes
- Get documentation for incomplete features
- Request rollback suggestions if issues found
- Ask for testing strategy for new features

### Section 6: Server vs Client Components

**What it maps:**
- Every component in `/app`
- Tagged as [SC] Server Component or [CC] Client Component
- Grouped by folder for easy navigation

**Example:**
```
## 6. Server vs Client Components

### `/`
- [SC] layout.tsx
- [SC] page.tsx

### `/(auth)`
- [SC] layout.tsx
- [CC] LoginForm.tsx
- [CC] RegisterForm.tsx

### `/(dashboard)`
- [SC] layout.tsx
- [SC] page.tsx
- [CC] Card.tsx
- [SC] Header.tsx

### `/(dashboard)/products`
- [SC] page.tsx
- [CC] ProductCard.tsx
- [CC] ProductFilter.tsx
- [SC] ProductList.tsx

### `/(dashboard)/products/[id]`
- [SC] page.tsx
- [CC] RelatedProducts.tsx
- [CC] ReviewForm.tsx

### `/api`
- [SC] route.ts files (all route handlers are server-only)
```

**How to use with AI:**
- Ask for refactoring to move state management appropriately
- Get performance optimization for client components
- Request streaming implementation for server components
- Ask for hydration issue fixes

### Section 7: Data Models & Relations

**What it extracts:**
- Prisma schema models and fields
- Mongoose schemas
- Drizzle ORM schemas
- Database relationships and cardinality

**Example:**
```
## 7. Data Models & Relations

### User
**Fields:**
- id (UUID)
- email
- name
- password (hashed)
- role (admin, customer, moderator)
- createdAt
- updatedAt
- orders
- reviews

### Product
**Fields:**
- id (UUID)
- name
- description
- price
- category
- stock
- reviews
- orders

### Order
**Fields:**
- id (UUID)
- userId
- status (pending, shipped, delivered, cancelled)
- total
- items
- createdAt
- updatedAt

### OrderItem
**Fields:**
- id (UUID)
- orderId
- productId
- quantity
- price

### Review
**Fields:**
- id (UUID)
- userId
- productId
- rating (1-5)
- comment
- createdAt

### Relations
- User 1 ───── many ──→ Order
- User 1 ───── many ──→ Review
- Product 1 ───── many ──→ OrderItem
- Product 1 ───── many ──→ Review
- Order 1 ───── many ──→ OrderItem
```

**How to use with AI:**
- Ask for database migrations
- Request ORM query helpers
- Get validation rule suggestions
- Ask for index optimization for queries
- Request related entity loading patterns

### Section 8: Environment Variables

**What it lists:**
- All required environment variable keys
- **NEVER the values** - completely safe to share
- Helps configuration and deployment setup

**Example:**
```
## 8. Environment Variables

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXTAUTH_PROVIDERS_GITHUB_ID`
- `NEXTAUTH_PROVIDERS_GITHUB_SECRET`
- `NEXTAUTH_PROVIDERS_GOOGLE_ID`
- `NEXTAUTH_PROVIDERS_GOOGLE_SECRET`
- `DATABASE_URL`
- `DATABASE_URL_REPLICA`
- `REDIS_URL`
- `STRIPE_PUBLIC_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SENDGRID_API_KEY`
- `OPENAI_API_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET`
- `AWS_REGION`
- `SLACK_WEBHOOK_URL`
- `LOG_LEVEL`
```

**How to use with AI:**
- Ask for environment setup instructions
- Request .env.example template
- Get deployment checklist
- Ask for missing env var configuration

## Real-World Example: Full Conversation with AI

### Initial Setup
```
User: Here's my Next.js e-commerce project context:

[Paste entire lorex.md here]

I need help improving performance and fixing a bug where 
reviews aren't showing on product pages.
```

### AI Can Now:
1. **Analyze the structure** - See all components and routes
2. **Understand the data model** - Know that Review links to Product
3. **Check the implementation** - See that ProductPage is [SC] and uses [CC] ReviewForm
4. **Identify the bug** - See if Review.tsx is incorrectly marked as [CC]
5. **Suggest fixes** - Provide exact code changes with context
6. **Optimize performance** - Know which dependencies to use
7. **Plan features** - Understand your auth and database setup

### Example AI Response
```
I see your ProductPage [SC] uses ReviewForm [CC] component.
The issue is likely that ReviewForm isn't properly 
hydrating. Since you're using React Query, try:

1. Mark ReviewForm with "use client"
2. Move the review query to ReviewForm component
3. Use useQuery with proper error handling
4. For the related products, keep ProductList [SC]
   and fetch on server-side

You're using Stripe too - consider caching product data 
with React Query's staleTime to reduce database load.
```

## Workflow Example: Adding New Feature

### Step 1: Ask AI for Plan
```bash
lorex copy
```
_(Paste lorex.md into ChatGPT)_

```
I need to add a wishlist feature. My app structure is:
[lorex.md pasted]

What tables do I need, what routes, what components?
```

### Step 2: AI Provides Implementation Plan
AI will suggest:
- New `Wishlist` and `WishlistItem` models
- New routes: `/api/wishlist`, `/api/wishlist/[id]`
- New page: `/(dashboard)/wishlist`
- New components: `[CC] WishlistButton`, `[SC] WishlistPage`
- New env vars needed

### Step 3: Execute Implementation
```bash
# Generate your new components with exact context
# Push changes
git add .
git commit -m "Add wishlist feature"

# Update documentation
lorex update

# Share with team
lorex copy
```

## Commands Reference

```bash
# Create initial documentation
lorex init

# Update documentation (preserves your description)
lorex update

# Copy to clipboard (for pasting into AI)
lorex copy

# View in terminal
lorex show

# View short version (just stack summary)
lorex show --short

# See what changed since last scan
lorex diff

# Show detected project info
lorex info

# Get help
lorex --help
```

## Tips & Best Practices

### 1. Keep It Updated
```bash
# After major changes
lorex update

# Share updates with team
lorex copy
```

### 2. Use With IDE
```bash
# Generate after each major feature
lorex update

# Use in VS Code terminal for quick sharing
lorex copy
```

### 3. For Team Collaboration
```bash
# Add to your gitignore changes tracking
lorex diff

# Share before code reviews
lorex copy
```

### 4. For AI Conversations
```bash
# Always start new conversation with fresh context
lorex copy

# Update if requirements change
lorex update
```

## Output Customization

The tool automatically:
- ✅ Detects Next.js projects
- ✅ Generates optimized markdown
- ✅ Falls back to standard format for non-Next.js
- ✅ Handles monorepos (separate files per project)
- ✅ Creates backup files if updating

## Troubleshooting

### No routes detected
- Ensure `/app` directory exists
- Check file naming (page.tsx, route.ts, etc.)

### Auth not detected
- Verify package.json has next-auth or clerk
- Check NextAuth config is in `/app/api/auth/[...nextauth]/route.ts`

### Components not showing
- Ensure files are `.tsx` or `.jsx`
- Check they're inside `/app` directory

### Git commits not showing
- Verify project is a git repository
- Run `git log` manually to check commits exist

## Performance Notes

The tool scans typical Next.js projects:
- 100+ routes: < 2 seconds
- 50+ components: < 1 second
- Complex Prisma schemas: < 1 second
- Total: Usually **under 5 seconds**

## Security

✅ **Safe to Share**
- ❌ No environment values included (only keys)
- ❌ No API keys exposed
- ❌ No passwords or secrets
- ✅ Perfect for AI tools, GitHub, documentation

---

**Ready to use Lorex?** Start with:
```bash
npm install -g lorex-cli
lorex init
```

Your project's living memory awaits! 📝
