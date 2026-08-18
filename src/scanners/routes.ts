import fs from 'fs';
import path from 'path';
import { scanNestRoutes, isNestProject } from './nestjs';
import { scanExpressRoutes, isExpressProject } from './express';
import { scanNextJsRoutes } from './nextjs-routes';
import { dedupeRoutes } from '../utils/dedupe';

function readDeps(cwd: string): Record<string, string> {
  const packagePath = path.join(cwd, 'package.json');
  if (!fs.existsSync(packagePath)) return {};

  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    return { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  } catch {
    return {};
  }
}

function formatNextJsRoutes(nextJsRoutes: Awaited<ReturnType<typeof scanNextJsRoutes>>): string[] {
  const routes: string[] = [];

  for (const pageRoute of nextJsRoutes.pageRoutes) {
    routes.push(`PAGE ${pageRoute}`);
  }

  for (const apiRoute of nextJsRoutes.apiRoutes) {
    for (const method of apiRoute.methods) {
      let line = `${method} ${apiRoute.path}`;
      if (apiRoute.requestBodyFields && apiRoute.requestBodyFields.length > 0) {
        line += ` (body: ${apiRoute.requestBodyFields.join(', ')})`;
      }
      routes.push(line);
    }
  }

  return routes;
}

export async function scanRoutes(): Promise<string[]> {
  try {
    const cwd = process.cwd();
    const deps = readDeps(cwd);
    const routes: string[] = [];

    if (deps.next) {
      const nextJsRoutes = await scanNextJsRoutes();
      routes.push(...formatNextJsRoutes(nextJsRoutes));
      return dedupeRoutes(routes);
    }

    if (isNestProject(deps)) {
      routes.push(...(await scanNestRoutes(cwd)));
    }

    if (isExpressProject(deps)) {
      routes.push(...(await scanExpressRoutes(cwd)));
    }

    return dedupeRoutes(routes);
  } catch {
    return [];
  }
}
