import fs from 'fs';
import path from 'path';

const IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.cache',
  'coverage',
  '.vercel',
  '.turbo',
  '__pycache__',
  '.pytest_cache',
  '.venv',
  'venv',
];

interface TreeNode {
  name: string;
  isDir: boolean;
  children?: TreeNode[];
  isSpecialFile?: boolean; // For layout.tsx, page.tsx, etc
}

/**
 * Get display icon and name for special Next.js files
 */
function formatSpecialFile(filename: string): string {
  const specialFiles: Record<string, string> = {
    'page.tsx': 'page',
    'page.ts': 'page',
    'page.jsx': 'page',
    'page.js': 'page',
    'layout.tsx': 'layout',
    'layout.ts': 'layout',
    'layout.jsx': 'layout',
    'layout.js': 'layout',
    'route.ts': 'route',
    'route.tsx': 'route',
    'route.js': 'route',
    'route.jsx': 'route',
    'loading.tsx': 'loading',
    'loading.ts': 'loading',
    'loading.jsx': 'loading',
    'loading.js': 'loading',
    'error.tsx': 'error',
    'error.ts': 'error',
    'error.jsx': 'error',
    'error.js': 'error',
    'not-found.tsx': 'not-found',
    'not-found.ts': 'not-found',
    'not-found.jsx': 'not-found',
    'not-found.js': 'not-found',
    'middleware.ts': 'middleware',
    'middleware.js': 'middleware',
  };

  return specialFiles[filename] || filename;
}

/**
 * Check if this is a special Next.js file
 */
function isSpecialFile(filename: string): boolean {
  const specialFiles = [
    'page.tsx',
    'page.ts',
    'page.jsx',
    'page.js',
    'layout.tsx',
    'layout.ts',
    'layout.jsx',
    'layout.js',
    'route.ts',
    'route.tsx',
    'route.js',
    'route.jsx',
    'loading.tsx',
    'loading.ts',
    'loading.jsx',
    'loading.js',
    'error.tsx',
    'error.ts',
    'error.jsx',
    'error.js',
    'not-found.tsx',
    'not-found.ts',
    'not-found.jsx',
    'not-found.js',
    'middleware.ts',
    'middleware.js',
  ];
  return specialFiles.includes(filename);
}

/**
 * Check if this is a route group folder like (auth) or (dashboard)
 */
function isRouteGroup(dirname: string): boolean {
  return /^\([a-zA-Z0-9_-]+\)$/.test(dirname);
}

function scanFolder(
  dirPath: string,
  depth: number = 0,
  maxDepth: number = 4
): TreeNode[] {
  if (depth > maxDepth) return [];

  try {
    const items = fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((item) => !IGNORE_DIRS.includes(item.name))
      .sort((a, b) => {
        // Directories first, then special files, then regular files
        if (a.isDirectory() === b.isDirectory()) {
          // Both dirs or both files
          // Special files to top
          const aIsSpecial = isSpecialFile(a.name);
          const bIsSpecial = isSpecialFile(b.name);
          if (aIsSpecial !== bIsSpecial) return aIsSpecial ? -1 : 1;
          return a.name.localeCompare(b.name);
        }
        return a.isDirectory() ? -1 : 1;
      });

    const nodes: TreeNode[] = items.map((item) => {
      const fullPath = path.join(dirPath, item.name);
      let displayName = item.name;

      // Format special files with icons
      if (!item.isDirectory() && isSpecialFile(item.name)) {
        displayName = formatSpecialFile(item.name);
      }

      const node: TreeNode = {
        name: displayName,
        isDir: item.isDirectory(),
        isSpecialFile: !item.isDirectory() && isSpecialFile(item.name),
      };

      if (item.isDirectory()) {
        node.children = scanFolder(fullPath, depth + 1, maxDepth);
      }

      return node;
    });

    return nodes;
  } catch {
    return [];
  }
}

function nodesToString(nodes: TreeNode[], prefix: string = ''): string[] {
  const lines: string[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLastNode = i === nodes.length - 1;
    const connector = isLastNode ? '└── ' : '├── ';

    // Special formatting for route groups
    const isGroup = node.isDir && isRouteGroup(node.name);
    const displayName = isGroup ? `${node.name} [GROUP]` : node.name;

    lines.push(`${prefix}${connector}${displayName}`);

    if (node.children && node.children.length > 0) {
      const extension = isLastNode ? '    ' : '│   ';
      lines.push(...nodesToString(node.children, prefix + extension));
    }
  }

  return lines;
}

/**
 * Scan Next.js App Router project structure
 */
export function scanNextJsStructure(): string {
  try {
    const cwd = process.cwd();
    let appPath = path.join(cwd, 'app');

    // If /app doesn't exist, try common monorepo patterns
    if (!fs.existsSync(appPath)) {
      const alternativePaths = [
        path.join(cwd, 'apps', 'web', 'app'),
        path.join(cwd, 'packages', 'web', 'app'),
        path.join(cwd, 'src', 'app'),
      ];

      for (const altPath of alternativePaths) {
        if (fs.existsSync(altPath)) {
          appPath = altPath;
          break;
        }
      }
    }

    if (!fs.existsSync(appPath)) {
      return '(No Next.js App Router found)';
    }

    const nodes = scanFolder(appPath);
    const lines = ['```', ''];
    lines.push(...nodesToString(nodes));
    lines.push('', '```');

    return lines.join('\n');
  } catch (error) {
    return `(Unable to scan App Router structure)`;
  }
}
