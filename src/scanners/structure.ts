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

  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  const nodes: TreeNode[] = [];

  for (const item of items) {
    if (IGNORE_DIRS.includes(item.name)) continue;

    const fullPath = path.join(dirPath, item.name);
    const node: TreeNode = {
      name: item.name,
      isDir: item.isDirectory(),
    };

    if (item.isDirectory()) {
      node.children = scanFolder(fullPath, depth + 1, maxDepth);
    }

    nodes.push(node);
  }

  return nodes.sort((a, b) => {
    if (a.isDir === b.isDir) return a.name.localeCompare(b.name);
    return a.isDir ? -1 : 1;
  });
}

function nodesToString(
  nodes: TreeNode[],
  prefix: string = '',
  isLast: boolean = true
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
      lines.push(
        ...nodesToString(node.children, prefix + extension, isLastNode)
      );
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
