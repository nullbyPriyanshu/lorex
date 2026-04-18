import fs from 'fs';
import path from 'path';

export interface PackageInfo {
  name: string;
  description: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  stack: string[];
}

function detectStackFromFiles(): string[] {
  const cwd = process.cwd();
  const files = fs.readdirSync(cwd);
  const stack: string[] = [];

  if (files.some(f => f.endsWith('.html'))) stack.push('Vanilla HTML');
  if (files.some(f => f.endsWith('.css'))) stack.push('CSS');
  if (files.includes('tailwind.config.js') || files.includes('tailwind.config.ts')) {
    // Replace CSS with Tailwind CSS
    const cssIndex = stack.indexOf('CSS');
    if (cssIndex !== -1) stack[cssIndex] = 'Tailwind CSS';
    else stack.push('Tailwind CSS');
  }
  if (files.includes('vite.config.js') || files.includes('vite.config.ts')) stack.push('Vite');

  return stack;
}

export function scanPackage(): PackageInfo {
  const packagePath = path.join(process.cwd(), 'package.json');
  const hasPackageJson = fs.existsSync(packagePath);

  let pkg: any = {};
  let stack: string[] = [];

  if (hasPackageJson) {
    try {
      const content = fs.readFileSync(packagePath, 'utf-8');
      pkg = JSON.parse(content);
    } catch {
      // If can't parse, treat as no package.json
    }
  }

  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  // Detect stack from dependencies
  if (allDeps['next']) stack.push('Next.js');
  if (allDeps['express']) stack.push('Express');
  if (allDeps['@nestjs/core']) stack.push('NestJS');
  if (allDeps['socket.io']) stack.push('Socket.IO');
  if (allDeps['@prisma/client']) stack.push('Prisma');
  if (allDeps['mongoose']) stack.push('MongoDB');

  // Detect from files
  const fileStack = detectStackFromFiles();
  stack = stack.concat(fileStack);

  // If no stack detected and has package.json, default to Node.js
  if (stack.length === 0 && hasPackageJson) {
    stack.push('Node.js');
  }

  // Determine name
  let name = pkg.name;
  if (!name) {
    name = path.basename(process.cwd());
  }

  return {
    name,
    description: pkg.description || '',
    dependencies: pkg.dependencies || {},
    devDependencies: pkg.devDependencies || {},
    scripts: pkg.scripts || {},
    stack,
  };
}
