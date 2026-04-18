import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

export interface PackageInfo {
  name: string;
  description: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  stack: string[];
  projectType: string;
}

interface FileDetection {
  hasApp: boolean;
  hasPages: boolean;
  hasHtml: boolean;
  hasCss: boolean;
  hasReactFiles: boolean;
  hasTsConfig: boolean;
}

function detectFiles(root: string): FileDetection {
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

  return {
    hasApp: fs.existsSync(path.join(root, 'app')),
    hasPages: fs.existsSync(path.join(root, 'pages')),
    hasHtml: htmlFiles.length > 0,
    hasCss: cssFiles.length > 0,
    hasReactFiles: reactFiles.length > 0,
    hasTsConfig: fs.existsSync(path.join(root, 'tsconfig.json')),
  };
}

function formatPackageEntry(name: string, version?: string): string {
  return version ? `${name} ${version}` : name;
}

function detectStackDependencies(allDeps: Record<string, string>): string[] {
  const stack: string[] = [];
  const mapping: Record<string, string> = {
    next: 'Next.js',
    express: 'Express',
    '@nestjs/core': 'NestJS',
    'socket.io': 'Socket.IO',
    '@prisma/client': 'Prisma',
    mongoose: 'MongoDB',
    react: 'React',
    vue: 'Vue',
    svelte: 'Svelte',
    '@angular/core': 'Angular',
    vite: 'Vite',
    webpack: 'Webpack',
    typescript: 'TypeScript',
    tailwindcss: 'Tailwind CSS',
  };

  for (const [pkg, label] of Object.entries(mapping)) {
    if (allDeps[pkg]) {
      stack.push(formatPackageEntry(label, allDeps[pkg]));
    }
  }

  return stack;
}

function detectStackFromFiles(root: string, fileInfo: FileDetection): string[] {
  const stack: string[] = [];

  if (fileInfo.hasHtml) stack.push('Vanilla HTML');
  if (fileInfo.hasCss) stack.push('CSS');

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

  if (fileInfo.hasReactFiles) {
    stack.push('React');
  }

  if (fs.existsSync(path.join(root, 'prisma', 'schema.prisma'))) {
    stack.push('Prisma');
  }

  if (fileInfo.hasTsConfig) {
    stack.push('TypeScript');
  }

  return stack;
}

function detectProjectType(pkg: any, allDeps: Record<string, string>, fileInfo: FileDetection): string {
  const hasBin = pkg.bin && Object.keys(pkg.bin).length > 0;
  const hasCliDep = Boolean(
    allDeps['commander'] ||
    allDeps['yargs'] ||
    allDeps['meow'] ||
    allDeps['oclif'] ||
    allDeps['caporal']
  );

  if (hasBin || hasCliDep) {
    return 'CLI Tool';
  }

  const hasBackend = Boolean(
    allDeps['express'] ||
    allDeps['fastify'] ||
    allDeps['koa'] ||
    allDeps['@nestjs/core'] ||
    allDeps['next'] ||
    allDeps['@prisma/client'] ||
    allDeps['mongoose'] ||
    allDeps['typeorm'] ||
    allDeps['sequelize']
  );

  const hasFrontend = Boolean(
    allDeps['react'] ||
    allDeps['next'] ||
    allDeps['vue'] ||
    allDeps['svelte'] ||
    allDeps['@angular/core'] ||
    allDeps['vite'] ||
    fileInfo.hasApp ||
    fileInfo.hasPages ||
    fileInfo.hasHtml ||
    fileInfo.hasCss ||
    fileInfo.hasReactFiles
  );

  const isStaticSite = !hasBackend && (fileInfo.hasHtml || allDeps['vite'] || allDeps['webpack']);
  const isLibrary = Boolean(pkg.main || pkg.exports || pkg.types || pkg.module);

  if (hasBackend && hasFrontend) {
    return 'Full-Stack App';
  }

  if (hasFrontend && !hasBackend) {
    return isStaticSite ? 'Static Site' : 'Frontend Only';
  }

  if (hasBackend && !hasFrontend) {
    return 'Backend API';
  }

  if (isLibrary) {
    return 'Library/Package';
  }

  if (fileInfo.hasHtml) {
    return 'Static Site';
  }

  return 'Library/Package';
}

export function scanPackage(): PackageInfo {
  const root = process.cwd();
  const packagePath = path.join(root, 'package.json');
  const hasPackageJson = fs.existsSync(packagePath);

  let pkg: any = {};
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
  const fileInfo = detectFiles(root);

  const stackFromDeps = detectStackDependencies(allDeps);
  const stackFromFiles = detectStackFromFiles(root, fileInfo);
  const stackSet = new Set([...stackFromDeps, ...stackFromFiles]);
  const stack = Array.from(stackSet);

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
    projectType: detectProjectType(pkg, allDeps, fileInfo),
  };
}
