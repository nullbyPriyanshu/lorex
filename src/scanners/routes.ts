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
        // Scan for routes in all TypeScript/JavaScript files
        const routeFiles = await glob('**/*.{ts,js}', {
          cwd,
          ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
        });

        for (const file of routeFiles) {
          const filePath = path.join(cwd, file);
          try {
            const content = fs.readFileSync(filePath, 'utf-8');

            // Express router patterns
            const expressRoutes = content.match(
              /(?:router|app)\.(get|post|put|delete|patch|use|all)\(['"`]([^'"`]+)['"`]/g
            );

            if (expressRoutes) {
              for (const route of expressRoutes) {
                const match = route.match(/(?:router|app)\.\w+\(['"`]([^'"`]+)['"`]/);
                if (match) {
                  routes.add(match[1]);
                }
              }
            }

            // Fastify routes
            const fastifyRoutes = content.match(
              /fastify\.(get|post|put|delete|patch|all)\(['"`]([^'"`]+)['"`]/g
            );

            if (fastifyRoutes) {
              for (const route of fastifyRoutes) {
                const match = route.match(/fastify\.\w+\(['"`]([^'"`]+)['"`]/);
                if (match) {
                  routes.add(match[1]);
                }
              }
            }

            // Koa routes
            const koaRoutes = content.match(
              /router\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g
            );

            if (koaRoutes) {
              for (const route of koaRoutes) {
                const match = route.match(/router\.\w+\(['"`]([^'"`]+)['"`]/);
                if (match) {
                  routes.add(match[1]);
                }
              }
            }

            // NestJS routes (decorators)
            const nestRoutes = content.match(
              /@(?:Get|Post|Put|Delete|Patch)\(['"`]([^'"`]+)['"`]\)/g
            );

            if (nestRoutes) {
              for (const route of nestRoutes) {
                const match = route.match(/@\w+\(['"`]([^'"`]+)['"`]\)/);
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

    return Array.from(routes).sort();
  } catch {
    return [];
  }
}
