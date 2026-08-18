import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { collectSourceFiles } from '../utils/monorepo';
import { dedupeStrings } from '../utils/dedupe';
import { isScannableSourceFile } from '../utils/ignore';

const ENV_PATTERNS = [
  /process\.env\.([A-Z_][A-Z0-9_]*)/g,
  /process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g,
  /import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g,
  /import\.meta\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g,
];

function extractEnvKeysFromContent(content: string): string[] {
  const keys = new Set<string>();

  for (const pattern of ENV_PATTERNS) {
    pattern.lastIndex = 0;
    let match = pattern.exec(content);
    while (match) {
      keys.add(match[1]);
      match = pattern.exec(content);
    }
  }

  return Array.from(keys);
}

export async function scanEnv(): Promise<string[]> {
  try {
    const cwd = process.cwd();
    const sourceFiles = await collectSourceFiles(cwd);
    const keys = new Set<string>();

    for (const filePath of sourceFiles) {
      if (!isScannableSourceFile(filePath)) continue;

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        for (const key of extractEnvKeysFromContent(content)) {
          keys.add(key);
        }
      } catch {
        // ignore read errors
      }
    }

    return dedupeStrings(Array.from(keys)).sort();
  } catch {
    return [];
  }
}

// Backward-compatible alias for generators expecting EnvKey objects.
export interface EnvKey {
  key: string;
  source: string;
}

export function toEnvKeys(keys: string[]): EnvKey[] {
  return keys.map((key) => ({ key, source: 'code' }));
}
