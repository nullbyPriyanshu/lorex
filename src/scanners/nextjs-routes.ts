import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

export interface ApiRoute {
  path: string;
  methods: string[];
  requestBodyFields?: string[];
}

export interface NextJsRoutes {
  pageRoutes: string[];
  apiRoutes: ApiRoute[];
  middlewarePath?: string;
  middlewareMatchers?: string[];
}

/**
 * Parse the handler function to extract destructured fields from request.json()
 */
function extractRequestBodyFields(fileContent: string): string[] {
  const fields: string[] = [];

  // Match: const { field1, field2 } = await request.json()
  const destructureMatch = fileContent.match(
    /const\s+\{\s*([^}]+)\s*\}\s*=\s*await\s+(?:req\.body|request\.json\(\))/
  );

  if (destructureMatch) {
    const fieldString = destructureMatch[1];
    const fieldNames = fieldString.split(',').map((f) => f.trim());
    return fieldNames;
  }

  // Also try parsing function parameters
  const paramMatch = fileContent.match(
    /(?:async\s+)?(?:function\s+\w+\s*)?\(\s*(?:req|request).*\{\s*const\s+\{\s*([^}]+)\s*\}\s*=\s*await(?:\s+req\.body|request\.json\(\))/
  );

  if (paramMatch) {
    const fieldString = paramMatch[1];
    const fieldNames = fieldString.split(',').map((f) => f.trim());
    return fieldNames;
  }

  return fields;
}

/**
 * Extract HTTP methods exported from a route handler
 */
function extractHttpMethods(fileContent: string): string[] {
  const methods: string[] = [];
  const methodNames = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  for (const method of methodNames) {
    // Match: export const GET = ...
    // Match: export const POST = async (req, res) => ...
    if (
      new RegExp(`export\\s+const\\s+${method}\\s*=`).test(fileContent) ||
      new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}`).test(
        fileContent
      )
    ) {
      methods.push(method);
    }
  }

  return methods;
}

/**
 * Normalize the route path from file path
 */
function normalizeRoutePath(filePath: string, baseDir: string): string {
  // Remove the route.ts/route.js extension
  let normalized = filePath
    .replace(/route\.(ts|tsx|js|jsx)$/, '')
    .replace(/\\/g, '/');

  // Remove base directory
  if (normalized.startsWith(baseDir)) {
    normalized = normalized.substring(baseDir.length);
  }

  // Remove leading/trailing slashes
  normalized = normalized.replace(/^\/+|\/+$/g, '');

  if (normalized === '') {
    return '/api';
  }

  return '/api/' + normalized;
}

/**
 * Scan Next.js App Router for page routes and API endpoints
 */
export async function scanNextJsRoutes(): Promise<NextJsRoutes> {
  const cwd = process.cwd();
  const appPath = path.join(cwd, 'app');
  const result: NextJsRoutes = {
    pageRoutes: [],
    apiRoutes: [],
  };

  if (!fs.existsSync(appPath)) {
    return result;
  }

  try {
    // Find all page.tsx/page.js files
    const pageFiles = await glob('**/page.{ts,tsx,js,jsx}', {
      cwd: appPath,
      ignore: ['**/node_modules/**', '**/.next/**'],
    });

    for (const file of pageFiles) {
      let routePath = file
        .replace(/\/page\.(ts|tsx|js|jsx)$/, '')
        .replace(/\\/g, '/');

      // Handle route groups by keeping them in display but noting them
      const hasRouteGroup = /\([^)]+\)/.test(routePath);
      if (hasRouteGroup) {
        // Keep the route but note it has a group
        routePath = routePath.replace(/\/\([^)]+\)/g, '');
      }

      if (!routePath || routePath === '') {
        result.pageRoutes.push('/');
      } else {
        result.pageRoutes.push('/' + routePath);
      }
    }

    // Find all route.ts/route.js files in /app/api
    const apiFiles = await glob('api/**/route.{ts,tsx,js,jsx}', {
      cwd: appPath,
      ignore: ['**/node_modules/**', '**/.next/**'],
    });

    for (const file of apiFiles) {
      const filePath = path.join(appPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract route path
      const routePath = normalizeRoutePath(file, '/api');

      // Extract HTTP methods
      const methods = extractHttpMethods(content);

      // Extract request body fields for POST/PUT/PATCH
      const requestBodyFields =
        methods.some((m) => ['POST', 'PUT', 'PATCH'].includes(m)) &&
        content.includes('request.json()')
          ? extractRequestBodyFields(content)
          : undefined;

      result.apiRoutes.push({
        path: routePath,
        methods: methods.length > 0 ? methods : ['GET'], // Default to GET if no explicit methods found
        requestBodyFields: requestBodyFields,
      });
    }

    // Scan for middleware.ts
    const middlewarePath = path.join(appPath, '..', 'middleware.ts');
    const middlewarePathAlt = path.join(appPath, '..', 'middleware.js');

    if (fs.existsSync(middlewarePath)) {
      result.middlewarePath = 'middleware.ts';
      const content = fs.readFileSync(middlewarePath, 'utf-8');
      // Try to extract matcher config
      const matcherMatch = content.match(
        /matcher\s*:\s*\[([^\]]+)\]|export\s+const\s+config\s*=\s*\{[^}]*matcher[^}]*\}/
      );
      if (matcherMatch) {
        const matcherString = matcherMatch[1] || matcherMatch[0];
        const paths = matcherString.match(/['"](.*?)['"]/g);
        if (paths) {
          result.middlewareMatchers = paths.map((p) =>
            p.replace(/['"]/g, '')
          );
        }
      }
    } else if (fs.existsSync(middlewarePathAlt)) {
      result.middlewarePath = 'middleware.js';
    }

    // Sort routes for consistent output
    result.pageRoutes.sort();
    result.apiRoutes.sort((a, b) => a.path.localeCompare(b.path));

    return result;
  } catch (error) {
    console.error('Error scanning Next.js routes:', error);
    return result;
  }
}
