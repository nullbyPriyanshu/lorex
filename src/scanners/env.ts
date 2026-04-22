import fs from 'fs';
import path from 'path';

export interface EnvKey {
  key: string;
  source: string; // Which .env file it came from
}

/**
 * Scan environment variable files (.env, .env.local, .env.development, .env.production, .env.example)
 * Returns deduplicated list of keys with their source file
 */
export function scanEnv(): EnvKey[] {
  try {
    const cwd = process.cwd();
    const envFiles = [
      '.env',
      '.env.local',
      '.env.development',
      '.env.production',
      '.env.example',
    ];

    const keyMap: Record<string, string> = {}; // Use first occurrence's source file

    for (const envFile of envFiles) {
      const envPath = path.join(cwd, envFile);

      if (!fs.existsSync(envPath)) {
        continue;
      }

      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        const lines = content.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();

          // Skip empty lines and comments
          if (!trimmed || trimmed.startsWith('#')) {
            continue;
          }

          // Extract key (everything before the = sign)
          const keyMatch = /^([A-Z_][A-Z0-9_]*)\s*=/.exec(trimmed);
          if (keyMatch) {
            const key = keyMatch[1];
            // Store with source file, but only if key hasn't been seen yet
            if (!keyMap[key]) {
              keyMap[key] = envFile;
            }
          }
        }
      } catch {
        // Ignore read errors for individual files
      }
    }

    // Convert to array and return
    return Object.entries(keyMap).map(([key, source]) => ({
      key,
      source,
    }));
  } catch {
    return [];
  }
}
