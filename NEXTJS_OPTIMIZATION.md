# Lorex CLI - Next.js Optimization Update

## Overview

The lorex CLI tool has been upgraded to fully optimize for Next.js (App Router) projects with 8 comprehensive sections in the generated `lorex.md` file.

## New Features

### 1. **Routes & API Endpoints**
- Lists all page routes in the `/app` directory
- Detects all API routes in `/app/api/` with HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Automatically parses POST/PUT/PATCH request handlers to extract expected body fields
- Detects middleware.ts and its matching patterns

**Example output:**
```
## 1. Routes & API Endpoints

### Page Routes
- `/`
- `/dashboard`
- `/products`

### API Routes
- `/api/users` → GET, POST (body: name, email, password)
- `/api/users/[id]` → GET, PUT, DELETE

### Middleware
- **File:** `middleware.ts`
- **Matchers:** `/api/*`, `/dashboard/*`
```

### 2. **File & Folder Tree (App Router)**
- Displays the `/app` directory structure
- Properly renders route groups like `(auth)`, `(dashboard)`
- Distinguishes special Next.js files: `page.tsx`, `layout.tsx`, `route.ts`, etc.
- Clean, readable ASCII tree format

**Example output:**
```
## 2. File & Folder Tree (App Router)

├── (auth)
│   ├── login
│   │   └── page.tsx
│   └── register
│       └── page.tsx
├── api
│   └── auth
│       └── route.ts
├── layout.tsx
└── page.tsx
```

### 3. **Packages & Dependencies**
- Automatically groups packages by purpose:
  - **UI & Styling**: React, Next.js, Tailwind CSS, etc.
  - **Database**: Prisma, Mongoose, TypeORM, etc.
  - **Authentication**: NextAuth, Clerk, Passport, etc.
  - **State Management**: Redux, Zustand, Recoil, etc.
  - **Testing**: Jest, Vitest, Playwright, etc.
  - **Tooling & Build**: TypeScript, ESLint, Prettier, etc.
  - **Other**: Everything else

**Example output:**
```
## 3. Packages & Dependencies

### UI & Styling
- react `18.2.0`
- next `14.0.0`
- tailwindcss `3.3.0`

### Database
- @prisma/client `5.0.0`

### Authentication
- next-auth `4.23.0`

### Testing
- jest `29.7.0`
```

### 4. **Authentication**
- Auto-detects authentication setup:
  - **NextAuth.js** with providers (GitHub, Google, Credentials, etc.)
  - **Clerk** with OAuth providers
  - **Passport.js** or custom JWT implementations
- Displays session strategy (JWT or Database)
- Shows config files and providers

**Example output:**
```
## 4. Authentication

**Type:** NextAuth.js v4

**Providers:**
- GitHub
- Google
- Credentials

**Session Strategy:** JWT

**Config Files:**
- `app/api/auth/[...nextauth]/route.ts`
```

### 5. **Last 5 Git Commits**
- Shows the most recent commits
- Format: `<hash> · <message> · <date>`

**Example output:**
```
## 5. Last 5 Git Commits

- `a1f2c3d` · Add authentication middleware · 2024-04-20
- `f4e5d6c` · Update database schema · 2024-04-19
- `2b3c4d5` · Initial project setup · 2024-04-18
```

### 6. **Server vs Client Components**
- Scans all `.tsx`/`.jsx` files in `/app`
- Tags each file as:
  - `[SC]` Server Component (default)
  - `[CC]` Client Component (has "use client" directive)
- Groups components by folder for easy navigation

**Example output:**
```
## 6. Server vs Client Components

### `/`
- [SC] layout.tsx
- [SC] page.tsx

### `/dashboard`
- [SC] layout.tsx
- [CC] Dashboard.tsx
- [SC] Header.tsx

### `/api/auth`
- [SC] route.ts
```

### 7. **Data Models & Relations**
- Automatically detects and parses database schemas:
  - **Prisma**: Reads from `prisma/schema.prisma`
  - **Mongoose**: Scans for model files
  - **Drizzle ORM**: Reads schema files
  - **TypeORM**: Detects entity files
- Shows model fields and relationships

**Example output:**
```
## 7. Data Models & Relations

### User
**Fields:**
- id
- email
- name
- posts

### Post
**Fields:**
- id
- title
- content
- authorId

### Relations
- User 1 ───── many ──→ Post
```

### 8. **Environment Variables**
- Lists all environment variable keys (ONLY keys, never values)
- Scans `.env`, `.env.local`, `.env.example`
- Secure by design - no values are exposed

**Example output:**
```
## 8. Environment Variables

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `DATABASE_URL`
- `GITHUB_ID`
- `GITHUB_SECRET`
- `MONGODB_URI`
```

## New Scanner Functions

### Core Next.js Scanners

**`src/scanners/nextjs-routes.ts`**
- `scanNextJsRoutes()`: Detects all page and API routes with methods and request body fields

**`src/scanners/nextjs-structure.ts`**
- `scanNextJsStructure()`: Generates App Router aware folder tree

**`src/scanners/auth.ts`**
- `scanAuth()`: Detects authentication setup (NextAuth, Clerk, etc.)

**`src/scanners/components.ts`**
- `scanComponents()`: Maps server and client components

### Updated Scanners

**`src/scanners/git.ts`**
- `scanGitCommits(count)`: Returns structured commit data with hash, message, and date

**`src/utils/dependencies.ts`** (NEW)
- `groupDependencies()`: Groups packages by purpose/category

## Markdown Generators

**`src/generators/nextjs-markdown.ts`** (NEW)
- `generateNextJsMarkdown()`: Generates the complete Next.js optimized lorex.md
- Formats all 8 sections with proper markdown structure

## How It Works

The `init` command now:

1. Detects if the project is a Next.js App Router project
2. If Next.js detected:
   - Uses new Next.js scanners for all 8 sections
   - Generates optimized Next.js-specific markdown
3. If not Next.js:
   - Falls back to original scanner behavior

## Usage

```bash
# Create a new lorex.md for a Next.js project
lorex init

# Describe your project when prompted
# The tool will:
# - Scan routes and API endpoints
# - Detect authentication setup
# - Map server vs client components
# - Extract data model relations
# - List environment variables
# - And more...

# Copy to clipboard for AI tools
lorex copy

# View in terminal
lorex show

# Update existing documentation
lorex update
```

## Example Output

For a Next.js full-stack project, the generated `lorex.md` provides AI tools with complete context:

```markdown
# my-next-app

A modern e-commerce platform with real-time inventory management

## 1. Routes & API Endpoints

### Page Routes
- `/`
- `/products`
- `/products/[id]`
- `/checkout`
- `/dashboard`

### API Routes
- `/api/products` → GET (body: skip, limit)
- `/api/products` → POST (body: name, price, description)
- `/api/products/[id]` → PUT, DELETE
- `/api/auth/register` → POST (body: email, password)
- `/api/auth/login` → POST (body: email, password)

### Middleware
- **File:** `middleware.ts`
- **Matchers:** `/api/*`, `/dashboard/*`

[... sections 2-8 ...]
```

## Implementation Details

### Request Body Field Extraction

The tool parses handler functions to extract destructured fields:

```typescript
// Detected as: name, email, password
export async function POST(request: Request) {
  const { name, email, password } = await request.json();
  // ...
}
```

### Component Detection

Files are tagged based on presence of "use client" directive:

```typescript
// [CC] - Client Component
"use client"
import { useState } from 'react';

export default function Counter() { ... }
```

### Database Schema Handling

Automatically detects and parses:
- Prisma models with relations
- Mongoose schema definitions
- Drizzle SQL schema
- TypeORM entities

## Benefits

✅ **For Developers**: Comprehensive project documentation in one command
✅ **For AI Tools**: Complete context for better code suggestions
✅ **For Teams**: Shared understanding of project structure
✅ **For Onboarding**: Quick overview of project architecture
✅ **For AI Conversations**: Paste once, skip the explanations

## Technical Stack

- **Language**: Node.js + TypeScript
- **Dependencies**: Commander, Chalk, Ora, Glob, @clack/prompts
- **No heavy dependencies**: Uses only built-in Node.js modules for parsing
- **Safe**: Never exposes environment variable values

## Future Enhancements

Potential additions:
- Docker configuration detection
- Vercel/Netlify deployment config parsing
- Database migration history
- API documentation from JSDoc comments
- Performance optimization suggestions
- Security scan integration

---

**Generated by lorex-cli** - Your project's living memory
