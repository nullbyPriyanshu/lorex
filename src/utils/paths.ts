import fs from 'fs';
import path from 'path';

/**
 * Join route segments, collapsing duplicate slashes and handling empty segments.
 */
export function joinRoutePaths(...segments: string[]): string {
  const parts = segments
    .flatMap((segment) => segment.split('/'))
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return '/';
  }

  return '/' + parts.join('/');
}

/**
 * Resolve the TypeScript source root for a sub-project (src/ or tsconfig rootDir).
 */
export function resolveSourceDir(projectRoot: string): string {
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    try {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
      const compilerOptions = tsconfig.compilerOptions || {};
      if (compilerOptions.rootDir) {
        const rootDir = path.resolve(projectRoot, compilerOptions.rootDir);
        if (fs.existsSync(rootDir)) {
          return rootDir;
        }
      }
    } catch {
      // fall through
    }
  }

  const srcDir = path.join(projectRoot, 'src');
  if (fs.existsSync(srcDir)) {
    return srcDir;
  }

  return projectRoot;
}

/**
 * Resolve a path and reject anything under node_modules (including pnpm symlinks).
 */
export function isInsideNodeModules(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  const segments = resolved.split(path.sep);
  return segments.includes('node_modules');
}
