import path from 'path';

const SYSTEM_DIRECTORIES = new Set([
  path.resolve('/'),
  path.resolve('/home'),
  path.resolve('/usr'),
]);

export function isSystemDirectory(cwd: string = process.cwd()): boolean {
  return SYSTEM_DIRECTORIES.has(path.resolve(cwd));
}

export function getRelativePath(filePath: string): string {
  const relative = path.relative(process.cwd(), filePath);
  return relative.length === 0 ? path.basename(filePath) : relative;
}
