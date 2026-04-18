import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

export async function scanRoutes(): Promise<string[]> {
  try {
    const cwd = process.cwd();
    const routes: string[] = [];

    // Check for Next.js App Router (app folder)
    const appPath = path.join(cwd, 'app');
    if (fs.existsSync(appPath)) {
      const pages = await glob('**/page.tsx', {
        cwd: appPath,
        ignore: ['**/node_modules/**'],
      });

      for (const page of pages) {
        const routePath = page.replace('/page.tsx', '').replace(/\\/g, '/');
        routes.push(
          routePath === '' ? '/' : '/' + routePath.split('/').join('/')
        );
      }
    } else {
      // Check for Next.js Pages Router (pages folder)
      const pagesPath = path.join(cwd, 'pages');
      if (fs.existsSync(pagesPath)) {
        const pages = await glob('**/*.{tsx,ts}', {
          cwd: pagesPath,
          ignore: ['**/node_modules/**', '**/_*.tsx', '**/_*.ts'],
        });

        for (const page of pages) {
          const routePath = page
            .replace(/\.(tsx?|jsx?)$/, '')
            .replace(/\\/g, '/');
          routes.push(
            routePath === 'index' ? '/' : '/' + routePath.split('/').join('/')
          );
        }
      } else {
        // Check for Express-style routes
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
                /router\.(get|post|put|delete|patch)\('([^']+)'/g
              );

              if (expressRoutes) {
                for (const route of expressRoutes) {
                  const match = route.match(/router\.\w+\('([^']+)'/);
                  if (match) {
                    routes.push(match[1]);
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

    return [...new Set(routes)].sort();
  } catch {
    return [];
  }
}
