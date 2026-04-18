import fs from 'fs';
import path from 'path';
import glob from 'glob';

export interface PackageInfo {
  name: string;
  description: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  stack: string[];
}

function detectStackFromFiles(root: string): string[] {
  const stack: string[] = [];

  const htmlFiles = glob.sync('**/*.html', {
    cwd: root,
    ignore: ['node_modules/**'],
  });
  const cssFiles = glob.sync('**/*.css', {
    cwd: root,
    ignore: ['node_modules/**'],
  });
  const reactFiles = glob.sync('**/*.{jsx,tsx}', {
    cwd: root,
    ignore: ['node_modules/**'],
  });

  if (htmlFiles.length > 0) stack.push('Vanilla HTML');
  if (cssFiles.length > 0) stack.push('CSS');

  const tailwindConfig = fs.existsSync(path.join(root, 'tailwind.config.js')) ||
    fs.existsSync(path.join(root, 'tailwind.config.ts'));
  if (tailwindConfig) {
    const cssIndex = stack.indexOf('CSS');
    if (cssIndex !== -1) {
      stack[cssIndex] = 'Tailwind CSS';
    } else {
      stack.push('Tailwind CSS');
    }
  }

  if (fs.existsSync(path.join(root, 'vite.config.js')) || fs.existsSync(path.join(root, 'vite.config.ts'))) {
    stack.push('Vite');
  }

  if (fs.existsSync(path.join(root, 'webpack.config.js'))) {
    stack.push('Webpack');
  }

  if (reactFiles.length > 0) {
    stack.push('React');
  }

  if (fs.existsSync(path.join(root, 'prisma', 'schema.prisma'))) {
    stack.push('Prisma');
  }

  if (fs.existsSync(path.join(root, 'tsconfig.json'))) {
    stack.push('TypeScript');
  }

  return stack;
}

export function scanPackage(): PackageInfo {
  const root = process.cwd();
  const packagePath = path.join(root, 'package.json');
  const hasPackageJson = fs.existsSync(packagePath);

  let pkg: any = {};
  let stack: string[] = [];

  if (hasPackageJson) {
    try {
      const content = fs.readFileSync(packagePath, 'utf-8');
      pkg = JSON.parse(content);
    } catch {
      pkg = {};
    }
  }

  const dependencies = pkg.dependencies || {};
  const devDependencies = pkg.devDependencies || {};
  const allDeps = { ...dependencies, ...devDependencies };

  if (allDeps['next']) stack.push('Next.js');
  if (allDeps['express']) stack.push('Express');
  if (allDeps['@nestjs/core']) stack.push('NestJS');
  if (allDeps['socket.io']) stack.push('Socket.IO');
  if (allDeps['@prisma/client']) stack.push('Prisma');
  if (allDeps['mongoose']) stack.push('MongoDB');

  const fileStack = detectStackFromFiles(root);
  stack = stack.concat(fileStack.filter((item) => !stack.includes(item)));

  const hasActualDependencies = Object.keys(allDeps).length > 0;
  if (stack.length === 0) {
    if (hasPackageJson && hasActualDependencies) {
      stack.push('Node.js');
    } else {
      stack.push('Vanilla JS');
    }
  }

  let name = pkg.name;
  if (!name) {
    name = path.basename(root);
  }

  return {
    name,
    description: pkg.description || '',
    dependencies,
    devDependencies,
    scripts: pkg.scripts || {},
    stack,
  };
}
