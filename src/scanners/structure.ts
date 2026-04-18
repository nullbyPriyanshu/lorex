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
];

interface TreeNode {
  name: string;
  isDir: boolean;
  children?: TreeNode[];
}

function scanFolder(
  dirPath: string,
  depth: number = 0,
  maxDepth: number = 3
): TreeNode[] {
  if (depth > maxDepth) return [];

  const items = fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((item) => !IGNORE_DIRS.includes(item.name))
    .sort((a, b) => {
      if (a.isDirectory() === b.isDirectory()) return a.name.localeCompare(b.name);
      return a.isDirectory() ? -1 : 1;
    });

  const hiddenCount = items.length > 20 ? items.length - 10 : 0;
  const visibleItems = hiddenCount > 0 ? items.slice(0, 10) : items;

  const nodes: TreeNode[] = visibleItems.map((item) => {
    const fullPath = path.join(dirPath, item.name);
    const node: TreeNode = {
      name: item.name,
      isDir: item.isDirectory(),
    };

    if (item.isDirectory()) {
      node.children = scanFolder(fullPath, depth + 1, maxDepth);
    }

    return node;
  });

  if (hiddenCount > 0) {
    nodes.push({
      name: `... and ${hiddenCount} more files`,
      isDir: false,
    });
  }

  return nodes;
}

function nodesToString(
  nodes: TreeNode[],
  prefix: string = ''
): string[] {
  const lines: string[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLastNode = i === nodes.length - 1;
    const connector = isLastNode ? '└── ' : '├── ';
    const icon = node.isDir ? '📁 ' : '📄 ';

    lines.push(`${prefix}${connector}${icon}${node.name}`);

    if (node.children && node.children.length > 0) {
      const extension = isLastNode ? '    ' : '│   ';
      lines.push(...nodesToString(node.children, prefix + extension));
    }
  }

  return lines;
}

export function scanStructure(): string {
  try {
    const cwd = process.cwd();
    const nodes = scanFolder(cwd);
    const lines = ['📁 Project Structure:', ''];
    lines.push(...nodesToString(nodes));
    return lines.join('\n');
  } catch {
    return 'Unable to scan folder structure';
  }
}
