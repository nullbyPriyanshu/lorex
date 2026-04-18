# lorex

> Your project's living memory.

lorex scans your entire project and generates a `lorex.md` brief you can paste into any AI chat instantly. No AI, no API keys, works fully offline.

## Install

```bash
npm install -g lorex-cli
```

## Usage

```bash
lorex init      # scan project and generate lorex.md
lorex update    # re-scan after adding features
lorex copy      # copy brief to clipboard
lorex show      # print brief in terminal
```

## What it scans

- Folder structure
- package.json (stack, dependencies, scripts)
- Database schema (Prisma / Drizzle)
- Routes (Next.js / Express)
- Environment variable keys
- Git history (last 10 commits)

## Why

Every time you open a new AI chat you re-explain your entire project from scratch. lorex fixes that.

## Status

🚧 Under active development. CLI coming soon.

## License

MIT