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
 * Handles multiple patterns:
 * - const { name, email } = await request.json()
 * - const body = await request.json(); body.name, body.email
 * - const data = await req.json()
 * - zod schema z.object({ name, email })
 */
function extractRequestBodyFields(fileContent: string): string[] {
  const fields: Set<string> = new Set();

  try {
    // Pattern 1: const { name, email } = await request.json()
    const destructurePattern = /const\s+\{\s*([^}]+)\s*\}\s*=\s*await\s+(?:req|request)\.json\(\)/g;
    let match = destructurePattern.exec(fileContent);
    while (match) {
      const fieldString = match[1];
      fieldString.split(',').forEach((f) => {
        const field = f.trim();
        if (field && !field.includes('=')) {
          fields.add(field);
        }
      });
      match = destructurePattern.exec(fileContent);
    }

    // Pattern 2: const body = await request.json(); then body.field access
    const bodyVarPattern = /const\s+(\w+)\s*=\s*await\s+(?:req|request)\.json\(\)/;
    const bodyVarMatch = bodyVarPattern.exec(fileContent);
    if (bodyVarMatch) {
      const varName = bodyVarMatch[1];
      const fieldAccessPattern = new RegExp(`${varName}\\.([a-zA-Z_$][a-zA-Z0-9_$]*)`, 'g');
      let fieldMatch = fieldAccessPattern.exec(fileContent);
      while (fieldMatch) {
        fields.add(fieldMatch[1]);
        fieldMatch = fieldAccessPattern.exec(fileContent);
      }
    }

    // Pattern 3: zod schema validation z.object({ name, email, ... })
    const zodPattern = /z\.object\(\s*\{\s*([^}]+)\}/;
    const zodMatch = zodPattern.exec(fileContent);
    if (zodMatch) {
      const fieldString = zodMatch[1];
      fieldString.split(',').forEach((f) => {
        const field = f.trim();
        // Extract field name (before : or optional modifier)
        const fieldName = field.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/)?.[1];
        if (fieldName) {
          fields.add(fieldName);
        }
      });
    }

    // Pattern 4: const data = await req.json() (or similar variations)
    const simplePattern = /const\s+(\w+)\s*=\s*await\s+(?:req\.json\(\)|request\.body)/;
    const simpleMatch = simplePattern.exec(fileContent);
    if (simpleMatch && fields.size === 0) {
      // If we still have no fields and found a body variable, mark as "unknown"
      // but we prefer to return empty array to put "body: unknown" in caller
    }

    return Array.from(fields);
  } catch {
    return [];
  }
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
      try {
        const filePath = path.join(appPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Extract route path
        const routePath = normalizeRoutePath(file, '/api');

        // Extract HTTP methods
        const methods = extractHttpMethods(content);

        // Extract request body fields for POST/PUT/PATCH
        let requestBodyFields: string[] | undefined;
        if (methods.some((m) => ['POST', 'PUT', 'PATCH'].includes(m)) && 
            content.includes('json()')) {
          const fields = extractRequestBodyFields(content);
          requestBodyFields = fields.length > 0 ? fields : undefined;
        }

        result.apiRoutes.push({
          path: routePath,
          methods: methods.length > 0 ? methods : ['GET'], // Default to GET if no explicit methods found
          requestBodyFields: requestBodyFields,
        });
      } catch (fileError) {
        // Skip files that can't be read
        continue;
      }
    }

    // Scan for middleware.ts
    const middlewarePath = path.join(appPath, '..', 'middleware.ts');
    const middlewarePathAlt = path.join(appPath, '..', 'middleware.js');

    if (fs.existsSync(middlewarePath)) {
      result.middlewarePath = 'middleware.ts';
      try {
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
      } catch {
        // Ignore middleware parsing errors
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
