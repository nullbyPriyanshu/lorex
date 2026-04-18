# Lorex 📝

> Your project's living memory - Document everything about your project automatically.

⚠️ lorex is a CLI tool — install globally for best experience:
```bash
npm install -g lorex-cli
```
Or use without installing:
```bash
npx lorex-cli init
```

Lorex scans your entire project structure and generates comprehensive documentation in seconds. It detects your tech stack, database models, routes, environment variables, and recent git activity—all without any configuration.

## Features

✨ **Zero Configuration** - Works out of the box with any Node.js project
🚀 **Auto-Detection** - Identifies Next.js, Express, NestJS, Prisma, MongoDB, and more
📊 **Complete Scanning** - Analyzes folder structure, routes, database models, and environment
💾 **Export Options** - Copy to clipboard or display in terminal
🔄 **Update Friendly** - Refresh documentation while keeping your description
🎨 **Beautiful Output** - Colorful, well-formatted terminal UI

## Installation

### With npm
```bash
npm install -g lorex-cli
```

### With yarn
```bash
yarn global add lorex-cli
```

### From Source
```bash
git clone https://github.com/justpriyanshu/lorex.git
cd lorex
npm install
npm run build
npm link  # or: npm install -g .
```

## Usage

### Initialize Documentation
Generates a new `lorex.md` file for your project:

```bash
lorex init
```

The CLI will:
1. Ask you to describe your project in one line
2. Scan your entire project structure
3. Detect your tech stack
4. Extract database models, routes, and environment variables
5. Fetch your last 10 commits
6. Generate a comprehensive `lorex.md` file

### Update Documentation
Refresh your existing documentation:

```bash
lorex update
```

This preserves your original one-line description and re-scans everything else.

### Copy to Clipboard
Copy your documentation to clipboard for quick sharing:

```bash
lorex copy
```

### Display in Terminal
View your documentation right in the terminal:

```bash
lorex show
```

### Help
View available commands:

```bash
lorex --help
lorex init --help
```

## What Gets Generated

Running `lorex init` creates a `lorex.md` file with these sections:

- **Project Title** - Your package name
- **Description** - Your one-line project description
- **Stack** - Detected technologies (Next.js, Express, Prisma, etc.)
- **Folder Structure** - Visual tree of your project
- **Database Models** - All Prisma models and their fields
- **Environment Keys** - Required environment variables
- **Routes** - All API/page routes in your project
- **Git Activity** - Last 10 commit messages

## Examples

### Example Output Structure
```
# my-app

A full-stack social media platform with real-time notifications

## Stack
- Next.js
- Prisma
- PostgreSQL

## Folder Structure
📁 Project Structure:

├── 📁 app
│   ├── 📄 layout.tsx
│   └── 📁 api
│       └── 📄 route.ts
├── 📄 package.json
└── prisma
    └── schema.prisma

## Database Models
### User
- id
- email
- name
- createdAt

## Routes
- /api/users
- /api/posts

## Recent Git Activity
- fix: update user validation
- feat: add notifications
```

## Ignored Folders

The scanner automatically ignores these folders to keep output clean:

- `node_modules`
- `.git`
- `.next`
- `dist`
- `build`
- `.cache`
- `coverage`

## Stack Detection

Lorex auto-detects these technologies based on your dependencies:

| Package | Detected As |
|---------|------------|
| `next` | Next.js |
| `express` | Express |
| `@nestjs/core` | NestJS |
| `socket.io` | Socket.IO |
| `@prisma/client` | Prisma |
| `mongoose` | MongoDB |

## FAQ

**Q: Does lorex.md get committed to git?**  
A: No! `lorex.md` is in `.gitignore` by default to avoid merge conflicts.

**Q: Can I manually edit lorex.md?**  
A: Yes, but running `lorex update` will overwrite changes. Keep your edits in other documentation.

**Q: Does lorex require any configuration?**  
A: No configuration needed! It works with any Node.js project.

**Q: Is my code safe?**  
A: Completely safe! Lorex runs entirely offline and never sends data anywhere. It reads environment keys only (never values) and git history.

## Development

### Clone and Setup
```bash
git clone https://github.com/justpriyanshu/lorex.git
cd lorex
npm install
```

### Build
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

## License

MIT © 2026 Priyanshu

## Contributing

Contributions welcome! Feel free to open issues and pull requests.