import fs from 'fs';
import path from 'path';

export function scanEnv(): string[] {
  try {
    const cwd = process.cwd();

    // Try .env.example first
    let envPath = path.join(cwd, '.env.example');
    if (!fs.existsSync(envPath)) {
      // Try .env.local
      envPath = path.join(cwd, '.env.local');
    }

    if (!fs.existsSync(envPath)) {
      return [];
    }

    const content = fs.readFileSync(envPath, 'utf-8');
    const keys: string[] = [];

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const keyMatch = /^([A-Z_][A-Z0-9_]*)\s*=/.exec(trimmed);
        if (keyMatch) {
          keys.push(keyMatch[1]);
        }
      }
    }

    return keys;
  } catch {
    return [];
  }
}
