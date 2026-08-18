import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { hasUseClientDirective } from './nextjs-routes';

export interface ComponentInfo {
  file: string;
  type: 'SC' | 'CC';
  folder: string;
}

function getRelativeFolder(filePath: string, basePath: string): string {
  const relative = path.relative(basePath, filePath);
  const dirname = path.dirname(relative);
  return dirname === '.' ? '/' : dirname.replace(/\\/g, '/');
}

export async function scanComponents(cwd: string): Promise<ComponentInfo[]> {
  const appPath = path.join(cwd, 'app');
  const components: ComponentInfo[] = [];

  if (!fs.existsSync(appPath)) {
    return components;
  }

  try {
    const files = await glob('**/*.{tsx,jsx}', {
      cwd: appPath,
      ignore: ['**/node_modules/**', '**/.next/**', '**/__tests__/**'],
    });

    for (const file of files) {
      try {
        const filePath = path.join(appPath, file);
        const isApiRoute = file.startsWith('api/') || file.includes('/api/');
        let componentType: 'SC' | 'CC' = 'SC';

        if (!isApiRoute) {
          const content = fs.readFileSync(filePath, 'utf-8');
          componentType = hasUseClientDirective(content, path.basename(filePath))
            ? 'CC'
            : 'SC';
        }

        components.push({
          file: path.basename(filePath),
          type: componentType,
          folder: getRelativeFolder(filePath, appPath),
        });
      } catch {
        continue;
      }
    }

    components.sort((a, b) => {
      if (a.folder !== b.folder) {
        return a.folder.localeCompare(b.folder);
      }
      return a.file.localeCompare(b.file);
    });

    return components;
  } catch {
    return components;
  }
}
