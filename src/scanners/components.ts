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
 * A file is a client component if it has "use client" at the top
 */
function isClientComponent(fileContent: string): boolean {
  // Check for "use client" directive at the start of the file
  // It should be one of the first lines (allowing for comments)
  const lines = fileContent.split('\n');

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('//') || line.startsWith('/*')) {
      continue;
    }

    // Check for "use client" directive
    if (line === '"use client"' || line === "'use client'" || line === '`use client`') {
      return true;
    }

    // Stop checking after first non-comment/non-empty line
    break;
  }

  return false;
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
      const filePath = path.join(appPath, file);

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const isClient = isClientComponent(content);
        const folder = getRelativeFolder(filePath, appPath);

        components.push({
          file: path.basename(filePath),
          type: isClient ? 'CC' : 'SC',
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
    console.error('Error scanning components:', error);
    return components;
  }
}
