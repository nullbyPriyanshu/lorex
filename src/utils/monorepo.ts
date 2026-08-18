import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { shouldIgnoreDir, isScannableSourceFile } from './ignore';
import { isInsideNodeModules } from './paths';

export interface ProjectTarget {
  root: string;
  outputFile: string;
}

const ORCHESTRATOR_DEPS = new Set([
  'turbo',
  'nx',
  'lerna',
  'pnpm',
  'npm-run-all',
  'concurrently',
  'workspace-tools',
]);

function hasOwnProjectCode(root: string, pkg: Record<string, unknown>): boolean {
  const deps = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  };

  const meaningfulDeps = Object.keys(deps).filter((dep) => !ORCHESTRATOR_DEPS.has(dep));
  if (meaningfulDeps.length > 0) {
    return true;
  }

  const scripts = (pkg.scripts as Record<string, string> | undefined) || {};
  const scriptNames = Object.keys(scripts).filter((name) => name !== 'prepare');
  if (scriptNames.length > 0) {
    return true;
  }

  const srcDir = path.join(root, 'src');
  if (fs.existsSync(srcDir)) {
    return true;
  }

  for (const dir of ['app', 'pages', 'lib']) {
    if (fs.existsSync(path.join(root, dir))) {
      return true;
    }
  }

  return false;
}

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function expandWorkspacePattern(root: string, pattern: string): string[] {
  const normalized = pattern.replace(/\\/g, '/').replace(/\/\*$/, '/*');
  const matches = glob.sync(normalized, {
    cwd: root,
    absolute: true,
    ignore: ['**/node_modules/**'],
  });

  return matches.filter(
    (match) => fs.existsSync(match) && fs.statSync(match).isDirectory() && fs.existsSync(path.join(match, 'package.json'))
  );
}

function getWorkspacePatterns(root: string): string[] {
  const patterns: string[] = [];

  const packageJson = readJsonFile(path.join(root, 'package.json'));
  if (packageJson?.workspaces) {
    const workspaces = packageJson.workspaces;
    if (Array.isArray(workspaces)) {
      patterns.push(...workspaces.map(String));
    } else if (typeof workspaces === 'object' && workspaces !== null) {
      const packages = (workspaces as { packages?: string[] }).packages;
      if (Array.isArray(packages)) {
        patterns.push(...packages.map(String));
      }
    }
  }

  const pnpmWorkspace = path.join(root, 'pnpm-workspace.yaml');
  if (fs.existsSync(pnpmWorkspace)) {
    try {
      const content = fs.readFileSync(pnpmWorkspace, 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^\s*-\s*['"]?([^'"]+)['"]?\s*$/);
        if (match) {
          patterns.push(match[1]);
        }
      }
    } catch {
      // ignore
    }
  }

  for (const configFile of ['turbo.json', 'nx.json']) {
    const configPath = path.join(root, configFile);
    if (!fs.existsSync(configPath)) continue;
    const config = readJsonFile(configPath);
    if (!config) continue;

    const workspaceGlobs = [
      ...(Array.isArray(config.workspaces) ? config.workspaces : []),
      ...((config as { workspaceLayout?: { appsDir?: string; libsDir?: string } }).workspaceLayout
        ? [
            `${(config as { workspaceLayout?: { appsDir?: string } }).workspaceLayout?.appsDir || 'apps'}/*`,
            `${(config as { workspaceLayout?: { libsDir?: string } }).workspaceLayout?.libsDir || 'libs'}/*`,
          ]
        : []),
    ].map(String);

    patterns.push(...workspaceGlobs);
  }

  return [...new Set(patterns)];
}

function findImmediateSubProjects(root: string): string[] {
  const subProjects: string[] = [];

  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || shouldIgnoreDir(entry.name)) {
        continue;
      }

      const folderPath = path.join(root, entry.name);
      if (fs.existsSync(path.join(folderPath, 'package.json'))) {
        subProjects.push(folderPath);
      }
    }
  } catch {
    // ignore
  }

  return subProjects.sort();
}

function findWorkspaceSubProjects(root: string): string[] {
  const patterns = getWorkspacePatterns(root);
  if (patterns.length === 0) {
    return [];
  }

  const subProjects = new Set<string>();
  for (const pattern of patterns) {
    for (const match of expandWorkspacePattern(root, pattern)) {
      subProjects.add(match);
    }
  }

  return Array.from(subProjects).sort();
}

export function detectProjects(root: string = process.cwd()): ProjectTarget[] {
  const workspaceSubProjects = findWorkspaceSubProjects(root);
  const subProjects =
    workspaceSubProjects.length > 0 ? workspaceSubProjects : findImmediateSubProjects(root);

  if (subProjects.length >= 2) {
    const targets: ProjectTarget[] = subProjects.map((projectRoot) => ({
      root: projectRoot,
      outputFile: `lorex.${path.basename(projectRoot)}.md`,
    }));

    const rootPackagePath = path.join(root, 'package.json');
    if (fs.existsSync(rootPackagePath)) {
      const rootPkg = readJsonFile(rootPackagePath) || {};
      if (hasOwnProjectCode(root, rootPkg)) {
        targets.unshift({ root, outputFile: 'lorex.md' });
      }
    }

    return targets;
  }

  return [{ root, outputFile: 'lorex.md' }];
}

export async function collectSourceFiles(
  projectRoot: string,
  sourceDir?: string
): Promise<string[]> {
  const scanRoot = sourceDir || projectRoot;
  const files = await glob('**/*.{ts,tsx,js,jsx,mjs,cjs}', {
    cwd: scanRoot,
    absolute: true,
    ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/.next/**'],
  });

  return files.filter((filePath) => {
    if (!isScannableSourceFile(filePath)) return false;
    if (isInsideNodeModules(filePath)) return false;
    return true;
  });
}
