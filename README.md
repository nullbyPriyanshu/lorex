# lorex

Drop it in any project. Never explain your codebase to an AI again.

```bash
npm install -g lorex-cli
```

---

AI tools are only as useful as the context you give them. Lorex generates a single `lorex.md` file that captures everything about your project - stack, structure, models, routes, env keys, recent commits , so you can paste it once and skip the 5-minute explanation every time you start a new conversation.

It runs entirely offline. It reads no values, only keys. Nothing leaves your machine.

---

## Commands

```bash
lorex init      # scan project, generate lorex.md
lorex update    # re-scan, preserve your description
lorex copy      # copy lorex.md to clipboard
lorex show      # print lorex.md in terminal
lorex diff      # show what changed since last scan
lorex info      # print detected lorex summary
lorex --help    # list all commands
```

---

## What it captures

- **Stack** - detects Next.js, Express, NestJS, Socket.IO, Prisma, Mongoose, and more from your dependencies
- **Folder structure** - visual tree, ignoring noise (`node_modules`, `.git`, `.next`, `dist`, etc.)
- **Database models** - all Prisma models and their fields
- **Routes** - API and page routes across your project
- **Environment keys** - what's required, never what the values are
- **Git activity** - last 10 commits

---

## Example output

```
# my-app

A full-stack social platform with real-time notifications

## Stack
- Next.js, Prisma, PostgreSQL, Socket.IO

## Folder Structure
├── app/
│   ├── layout.tsx
│   └── api/route.ts
├── prisma/schema.prisma
└── package.json

## Database Models
### User
- id, email, name, createdAt

## Routes
- /api/users
- /api/posts

## Environment Keys
- DATABASE_URL
- NEXTAUTH_SECRET

## Recent Git Activity
- feat: add real-time notifications
- fix: session token expiry
```

---

## Stack detection

| Dependency | Detected as |
|---|---|
| `next` | Next.js |
| `express` | Express |
| `@nestjs/core` | NestJS |
| `socket.io` | Socket.IO |
| `@prisma/client` | Prisma |
| `mongoose` | MongoDB |

---

## Notes

- `lorex.md` is gitignored by default - no merge conflicts
- Running `lorex update` preserves your one-line description, rescans everything else
- Works with any Node.js project, zero config required

---

## Install from source

```bash
git clone https://github.com/justpriyanshu/lorex.git
cd lorex
npm install
npm run build
npm link
```

---

MIT © 2026 Priyanshu