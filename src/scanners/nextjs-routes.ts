import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import ts from 'typescript';
import { readFileContent } from '../utils/typescript';
import { joinRoutePaths } from '../utils/paths';
import { dedupeStrings } from '../utils/dedupe';

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
  routerMode: Array<'app' | 'pages'>;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;

function extractRequestBodyFields(fileContent: string): string[] {
  const fields = new Set<string>();

  const destructurePattern = /const\s+\{\s*([^}]+)\s*\}\s*=\s*await\s+(?:req|request)\.json\(\)/g;
  let match = destructurePattern.exec(fileContent);
  while (match) {
    match[1].split(',').forEach((field) => {
      const trimmed = field.trim();
      if (trimmed && !trimmed.includes('=')) {
        fields.add(trimmed);
      }
    });
    match = destructurePattern.exec(fileContent);
  }

  const zodMatch = /z\.object\(\s*\{\s*([^}]+)\}/.exec(fileContent);
  if (zodMatch) {
    zodMatch[1].split(',').forEach((field) => {
      const fieldName = field.trim().match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/)?.[1];
      if (fieldName) fields.add(fieldName);
    });
  }

  return Array.from(fields);
}

function extractAppRouterMethods(fileContent: string): string[] {
  const methods: string[] = [];
  for (const method of HTTP_METHODS) {
    if (
      new RegExp(`export\\s+const\\s+${method}\\s*=`).test(fileContent) ||
      new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`).test(fileContent)
    ) {
      methods.push(method);
    }
  }
  return methods;
}

function extractPagesRouterMethods(fileContent: string): string[] {
  const methods = new Set<string>();

  for (const method of HTTP_METHODS) {
    const checks = [
      new RegExp(`req\\.method\\s*===\\s*['"]${method}['"]`, 'i'),
      new RegExp(`method\\s*===\\s*['"]${method}['"]`, 'i'),
      new RegExp(`case\\s*['"]${method}['"]`, 'i'),
    ];
    if (checks.some((pattern) => pattern.test(fileContent))) {
      methods.add(method);
    }
  }

  if (methods.size === 0) {
    methods.add('GET');
  }

  return Array.from(methods);
}

function normalizeAppSegment(segment: string): string | null {
  if (!segment) return null;

  if (segment.startsWith('@')) {
    return null;
  }

  if (segment.startsWith('(') && segment.endsWith(')')) {
    return null;
  }

  if (/^\(\./.test(segment)) {
    return null;
  }

  return segment;
}

function filePathToAppRoute(relativePath: string, fileType: 'page' | 'route'): string {
  const withoutFile = relativePath
    .replace(/\/(page|route)\.(tsx?|jsx?)$/, '')
    .replace(/\\/g, '/');

  const segments = withoutFile.split('/').filter(Boolean);
  const routeSegments = segments
    .map(normalizeAppSegment)
    .filter((segment): segment is string => Boolean(segment));

  if (routeSegments.length === 0) {
    return fileType === 'route' ? '/api' : '/';
  }

  if (fileType === 'route' && routeSegments[0] === 'api') {
    const apiSegments = routeSegments.slice(1);
    return apiSegments.length === 0 ? '/api' : joinRoutePaths('/api', ...apiSegments);
  }

  return joinRoutePaths(...routeSegments);
}

function pagesFileToRoute(relativePath: string): { path: string; isApi: boolean } {
  const routePath = relativePath
    .replace(/\.(tsx?|jsx?)$/, '')
    .replace(/\\/g, '/')
    .replace(/\/index$/, '');

  if (routePath.startsWith('api/') || routePath === 'api') {
    const apiPath = routePath.replace(/^api\/?/, '');
    return {
      path: apiPath ? joinRoutePaths('/api', apiPath) : '/api',
      isApi: true,
    };
  }

  return {
    path: routePath ? joinRoutePaths(routePath) : '/',
    isApi: false,
  };
}

function isSpecialPagesFile(filename: string): boolean {
  const basename = path.basename(filename, path.extname(filename));
  return basename.startsWith('_');
}

async function scanAppRouter(appPath: string): Promise<NextJsRoutes> {
  const result: NextJsRoutes = {
    pageRoutes: [],
    apiRoutes: [],
    routerMode: ['app'],
  };

  const pageFiles = await glob('**/page.{ts,tsx,js,jsx}', {
    cwd: appPath,
    ignore: ['**/node_modules/**', '**/.next/**'],
  });

  for (const file of pageFiles) {
    result.pageRoutes.push(filePathToAppRoute(file, 'page'));
  }

  const routeFiles = await glob('**/route.{ts,tsx,js,jsx}', {
    cwd: appPath,
    ignore: ['**/node_modules/**', '**/.next/**'],
  });

  for (const file of routeFiles) {
    const filePath = path.join(appPath, file);
    const content = readFileContent(filePath);
    const routePath = filePathToAppRoute(file, 'route');
    const methods = extractAppRouterMethods(content);
    let requestBodyFields: string[] | undefined;

    if (methods.some((method) => ['POST', 'PUT', 'PATCH'].includes(method))) {
      const fields = extractRequestBodyFields(content);
      requestBodyFields = fields.length > 0 ? fields : undefined;
    }

    result.apiRoutes.push({
      path: routePath,
      methods: methods.length > 0 ? methods : ['GET'],
      requestBodyFields,
    });
  }

  return result;
}

async function scanPagesRouter(pagesPath: string): Promise<NextJsRoutes> {
  const result: NextJsRoutes = {
    pageRoutes: [],
    apiRoutes: [],
    routerMode: ['pages'],
  };

  const files = await glob('**/*.{tsx,ts,jsx,js}', {
    cwd: pagesPath,
    ignore: ['**/node_modules/**', '**/.next/**'],
  });

  for (const file of files) {
    if (isSpecialPagesFile(file)) continue;

    const { path: routePath, isApi } = pagesFileToRoute(file);
    const filePath = path.join(pagesPath, file);

    if (isApi) {
      const content = readFileContent(filePath);
      const methods = extractPagesRouterMethods(content);
      let requestBodyFields: string[] | undefined;

      if (methods.some((method) => ['POST', 'PUT', 'PATCH'].includes(method))) {
        const fields = extractRequestBodyFields(content);
        requestBodyFields = fields.length > 0 ? fields : undefined;
      }

      result.apiRoutes.push({
        path: routePath,
        methods,
        requestBodyFields,
      });
    } else {
      result.pageRoutes.push(routePath);
    }
  }

  return result;
}

function scanMiddleware(projectRoot: string, result: NextJsRoutes): void {
  for (const filename of ['middleware.ts', 'middleware.js']) {
    const middlewarePath = path.join(projectRoot, filename);
    if (!fs.existsSync(middlewarePath)) continue;

    result.middlewarePath = filename;
    try {
      const content = readFileContent(middlewarePath);
      const matcherMatch = content.match(/matcher\s*:\s*\[([^\]]+)\]/);
      if (matcherMatch) {
        const paths = matcherMatch[1].match(/['"](.*?)['"]/g);
        if (paths) {
          result.middlewareMatchers = paths.map((entry) => entry.replace(/['"]/g, ''));
        }
      }
    } catch {
      // ignore
    }
    break;
  }
}

export async function scanNextJsRoutes(): Promise<NextJsRoutes> {
  const cwd = process.cwd();
  const appPath = path.join(cwd, 'app');
  const pagesPath = path.join(cwd, 'pages');

  const merged: NextJsRoutes = {
    pageRoutes: [],
    apiRoutes: [],
    routerMode: [],
  };

  if (fs.existsSync(appPath)) {
    const appRoutes = await scanAppRouter(appPath);
    merged.pageRoutes.push(...appRoutes.pageRoutes);
    merged.apiRoutes.push(...appRoutes.apiRoutes);
    merged.routerMode.push('app');
  }

  if (fs.existsSync(pagesPath)) {
    const pagesRoutes = await scanPagesRouter(pagesPath);
    merged.pageRoutes.push(...pagesRoutes.pageRoutes);
    merged.apiRoutes.push(...pagesRoutes.apiRoutes);
    merged.routerMode.push('pages');
  }

  scanMiddleware(cwd, merged);

  merged.pageRoutes = dedupeStrings(merged.pageRoutes).sort();
  merged.apiRoutes.sort((a, b) => a.path.localeCompare(b.path));

  return merged;
}

export function detectNextJsProject(deps: Record<string, string>): boolean {
  return Boolean(deps.next);
}

export function hasUseClientDirective(content: string, filename = 'component.tsx'): boolean {
  const scriptKind = filename.endsWith('.tsx') || filename.endsWith('.jsx')
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    filename,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  for (const statement of sourceFile.statements) {
    if (ts.isExpressionStatement(statement)) {
      const expression = statement.expression;
      if (
        ts.isStringLiteral(expression) ||
        ts.isNoSubstitutionTemplateLiteral(expression)
      ) {
        return expression.text === 'use client';
      }
      break;
    }
  }

  return false;
}
