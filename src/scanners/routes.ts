import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

function normalizeRoute(route: string): string {
  const clean = route
    .replace(/\\/g, '/')
    .replace(/\/(page|route)\.(tsx?|jsx?)$/, '')
    .replace(/\/+$/, '')
    .replace(/\/?\([^/]+?\)/g, '')
    .replace(/\/@[^/]+/g, '')
    .replace(/\/index$/, '');

  if (clean === '' || clean === '/') {
    return '/';
  }

  return clean.startsWith('/') ? clean : `/${clean}`;
}

export async function scanRoutes(): Promise<string[]> {
  try {
    const cwd = process.cwd();
    const routes = new Set<string>();

    const appPath = path.join(cwd, 'app');
    if (fs.existsSync(appPath)) {
      const pageFiles = await glob('**/page.{ts,tsx,js,jsx}', {
        cwd: appPath,
        ignore: ['**/node_modules/**'],
      });
      const routeFiles = await glob('**/route.{ts,tsx,js,jsx}', {
        cwd: appPath,
        ignore: ['**/node_modules/**'],
      });

      for (const file of [...pageFiles, ...routeFiles]) {
        routes.add(normalizeRoute(file));
      }
    } else {
      const pagesPath = path.join(cwd, 'pages');
      if (fs.existsSync(pagesPath)) {
        const pages = await glob('**/*.{tsx,ts,jsx,js}', {
          cwd: pagesPath,
          ignore: [
            '**/node_modules/**',
            '**/_*.tsx',
            '**/_*.ts',
            '**/_*.jsx',
            '**/_*.js',
          ],
        });

        for (const page of pages) {
          const routePath = page.replace(/\.(tsx?|jsx?)$/, '').replace(/\\/g, '/');
          const normalized = routePath === 'index' ? '/' : `/${routePath}`;
          routes.add(normalized);
        }
      } else {
        const srcPath = path.join(cwd, 'src');
        if (fs.existsSync(srcPath)) {
          const routeFiles = await glob('**/routes/**/*.{ts,js}', {
            cwd: srcPath,
            ignore: ['**/node_modules/**'],
          });

          for (const file of routeFiles) {
            const filePath = path.join(srcPath, file);
            try {
              const content = fs.readFileSync(filePath, 'utf-8');
              const expressRoutes = content.match(
                /router\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g
              );

              if (expressRoutes) {
                for (const route of expressRoutes) {
                  const match = route.match(/router\.\w+\(['"`]([^'"`]+)['"`]/);
                  if (match) {
                    routes.add(match[1]);
                  }
                }
              }
            } catch {
              // Ignore read errors
            }
          }
        }
      }
    }

    return Array.from(routes).sort();
  } catch {
    return [];
  }
}
