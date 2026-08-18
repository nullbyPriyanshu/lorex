import path from 'path';
import { collectSourceFiles } from '../utils/monorepo';
import { joinRoutePaths, resolveSourceDir } from '../utils/paths';
import { dedupeRoutes } from '../utils/dedupe';
import { readFileContent } from '../utils/typescript';

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'all'] as const;

interface MountEdge {
  parentVar: string;
  childVar: string;
  prefix: string;
}

interface ParsedRoute {
  variable: string;
  method: string;
  path: string;
}

function stripComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

function extractExpressInstances(content: string): Set<string> {
  const instances = new Set<string>();
  const declarationPatterns = [
    /(?:const|let|var)\s+(\w+)\s*=\s*express\s*\(\s*\)/g,
    /(?:const|let|var)\s+(\w+)\s*=\s*express\.Router\s*\(\s*\)/g,
    /(?:const|let|var)\s+(\w+)\s*=\s*Router\s*\(\s*\)/g,
  ];

  for (const pattern of declarationPatterns) {
    let match = pattern.exec(content);
    while (match) {
      instances.add(match[1]);
      match = pattern.exec(content);
    }
  }

  if (/module\.exports\s*=\s*express\s*\(\s*\)/.test(content)) {
    instances.add('app');
  }

  if (/export\s+default\s+express\s*\(\s*\)/.test(content)) {
    instances.add('app');
  }

  return instances;
}

function extractStringLiteral(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^['"`]([^'"`]*)['"`]$/);
  return match ? match[1] : null;
}

function extractRoutePath(argsText: string): string | null {
  const firstArg = argsText.split(',')[0]?.trim();
  if (!firstArg) return null;

  const literal = extractStringLiteral(firstArg);
  if (literal !== null) {
    return literal;
  }

  if (firstArg === "''" || firstArg === '""' || firstArg === '``') {
    return '';
  }

  return null;
}

function extractVariableReference(argsText: string): string | null {
  const parts = argsText.split(',');
  if (parts.length < 2) return null;

  const secondArg = parts.slice(1).join(',').trim();
  const match = secondArg.match(/^(\w+)/);
  return match ? match[1] : null;
}

function parseRoutesAndMounts(content: string): {
  routes: ParsedRoute[];
  mounts: MountEdge[];
  instances: Set<string>;
} {
  const cleaned = stripComments(content);
  const instances = extractExpressInstances(content);
  const routes: ParsedRoute[] = [];
  const mounts: MountEdge[] = [];

  const routePattern = new RegExp(
    `\\b(\\w+)\\.(?:${HTTP_METHODS.join('|')})\\s*\\(([^)]*)\\)`,
    'g'
  );

  let match = routePattern.exec(cleaned);
  while (match) {
    const variable = match[1];
    const argsText = match[2];
    const method = match[0].match(/\.(get|post|put|delete|patch|all)\s*\(/)?.[1];
    if (!method) {
      match = routePattern.exec(cleaned);
      continue;
    }

    const routePath = extractRoutePath(argsText);
    if (routePath !== null) {
      routes.push({
        variable,
        method: method.toUpperCase(),
        path: routePath,
      });
    }

    match = routePattern.exec(cleaned);
  }

  const usePattern = /\b(\w+)\.use\s*\(([^)]*)\)/g;
  match = usePattern.exec(cleaned);
  while (match) {
    const parentVar = match[1];
    const argsText = match[2];
    const prefix = extractRoutePath(argsText);
    const childVar = extractVariableReference(argsText);

    if (prefix !== null && childVar && instances.has(childVar)) {
      mounts.push({ parentVar, childVar, prefix });
    }

    match = usePattern.exec(cleaned);
  }

  return { routes, mounts, instances };
}

function buildPrefixMap(
  instances: Set<string>,
  mounts: MountEdge[]
): Map<string, string> {
  const prefixMap = new Map<string, string>();
  for (const instance of instances) {
    prefixMap.set(instance, '');
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const mount of mounts) {
      const parentPrefix = prefixMap.get(mount.parentVar) || '';
      const combined = joinRoutePaths(parentPrefix, mount.prefix);
      const current = prefixMap.get(mount.childVar) || '';

      if (current !== combined) {
        prefixMap.set(mount.childVar, combined);
        changed = true;
      }
    }
  }

  return prefixMap;
}

function formatExpressRoute(route: ParsedRoute, prefixMap: Map<string, string>): string {
  const prefix = prefixMap.get(route.variable) || '';
  const fullPath = joinRoutePaths(prefix, route.path);
  return `${route.method} ${fullPath}`;
}

export async function scanExpressRoutes(projectRoot: string): Promise<string[]> {
  const sourceDir = resolveSourceDir(projectRoot);
  const sourceFiles = await collectSourceFiles(projectRoot, sourceDir);
  const allRoutes: ParsedRoute[] = [];
  const allMounts: MountEdge[] = [];
  const allInstances = new Set<string>();

  for (const filePath of sourceFiles) {
    const content = readFileContent(filePath);
    if (!content.includes('express')) continue;

    const { routes, mounts, instances } = parseRoutesAndMounts(content);
    if (instances.size === 0) continue;

    for (const instance of instances) {
      allInstances.add(instance);
    }
    allRoutes.push(...routes);
    allMounts.push(...mounts);
  }

  const prefixMap = buildPrefixMap(allInstances, allMounts);
  const formatted = allRoutes.map((route) => formatExpressRoute(route, prefixMap));

  return dedupeRoutes(formatted);
}

export function isExpressProject(deps: Record<string, string>): boolean {
  return Boolean(deps.express);
}
