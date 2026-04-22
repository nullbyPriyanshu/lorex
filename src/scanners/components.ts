import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

export interface ComponentInfo {
  file: string;
  type: 'SC' | 'CC'; // Server Component or Client Component
  folder: string;
}

/**
 * Check if a file is a client component
 * A file is a client component if it has "use client" directive at the top
 * Supports both single and double quotes
 * Scans first 5 lines only for performance
 */
function isClientComponent(fileContent: string): boolean {
  try {
    const lines = fileContent.split('\n');

    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith('//') || line.startsWith('/*')) {
        continue;
      }

      // Check for "use client" directive with single or double quotes
      if (
        line === '"use client"' ||
        line === "'use client'" ||
        line === '`use client`' ||
        line.startsWith('"use client"') ||
        line.startsWith("'use client'") ||
        line.startsWith('`use client`')
      ) {
        return true;
      }

      // Stop checking after first non-comment/non-empty line
      break;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Get the folder path relative to /app
 */
function getRelativeFolder(filePath: string, basePath: string): string {
  const relative = path.relative(basePath, filePath);
  const dirname = path.dirname(relative);
  return dirname === '.' ? '/' : dirname.replace(/\\/g, '/');
}

/**
 * Scan /app for all .tsx/.jsx files and detect server vs client components
 */
export async function scanComponents(cwd: string): Promise<ComponentInfo[]> {
  const appPath = path.join(cwd, 'app');
  const components: ComponentInfo[] = [];

  if (!fs.existsSync(appPath)) {
    return components;
  }

  try {
    // Find all .tsx and .jsx files in /app
    const files = await glob('**/*.{tsx,jsx}', {
      cwd: appPath,
      ignore: ['**/node_modules/**', '**/.next/**', '**/__tests__/**'],
    });

    for (const file of files) {
      try {
        const filePath = path.join(appPath, file);

        // Files in /app/api/ are always server components (route handlers)
        const isApiRoute = file.startsWith('api' + path.sep) || file.startsWith('api/');
        
        let componentType: 'SC' | 'CC' = 'SC'; // Default to Server Component

        if (!isApiRoute) {
          const content = fs.readFileSync(filePath, 'utf-8');
          componentType = isClientComponent(content) ? 'CC' : 'SC';
        }

        const folder = getRelativeFolder(filePath, appPath);

        components.push({
          file: path.basename(filePath),
          type: componentType,
          folder: folder,
        });
      } catch {
        // Skip files that can't be read
        continue;
      }
    }

    // Sort by folder, then by filename
    components.sort((a, b) => {
      if (a.folder !== b.folder) {
        return a.folder.localeCompare(b.folder);
      }
      return a.file.localeCompare(b.file);
    });

    return components;
  } catch (error) {
    return components;
  }
}
