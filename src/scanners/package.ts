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

export function scanPackage(): PackageInfo {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const content = fs.readFileSync(packagePath, 'utf-8');
    const pkg = JSON.parse(content);

    const stack: string[] = [];
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    // Detect stack
    if (allDeps['next']) stack.push('Next.js');
    if (allDeps['express']) stack.push('Express');
    if (allDeps['@nestjs/core']) stack.push('NestJS');
    if (allDeps['socket.io']) stack.push('Socket.IO');
    if (allDeps['@prisma/client']) stack.push('Prisma');
    if (allDeps['mongoose']) stack.push('MongoDB');

    return {
      name: pkg.name || 'Unknown',
      description: pkg.description || '',
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
      scripts: pkg.scripts || {},
      stack: stack.length > 0 ? stack : ['Node.js'],
    };
  } catch {
    return {
      name: 'Unknown',
      description: '',
      dependencies: {},
      devDependencies: {},
      scripts: {},
      stack: ['Node.js'],
    };
  }
}
