import path from 'path';

export const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.turbo',
  'coverage',
]);

export const IGNORE_DIR_NAMES = Array.from(IGNORE_DIRS);

export function shouldIgnoreDir(name: string): boolean {
  return IGNORE_DIRS.has(name) || name.startsWith('.env');
}

export function shouldIgnorePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  const segments = normalized.split('/');

  for (const segment of segments) {
    if (IGNORE_DIRS.has(segment)) return true;
    if (segment.startsWith('.env')) return true;
  }

  return false;
}

export function isTestFile(filePath: string): boolean {
  const basename = path.basename(filePath);
  return (
    basename.endsWith('.test.ts') ||
    basename.endsWith('.test.js') ||
    basename.endsWith('.spec.ts') ||
    basename.endsWith('.spec.js')
  );
}

export function isScannableSourceFile(filePath: string): boolean {
  if (shouldIgnorePath(filePath)) return false;
  if (isTestFile(filePath)) return false;
  return /\.(tsx?|jsx?|mjs|cjs)$/.test(filePath);
}
