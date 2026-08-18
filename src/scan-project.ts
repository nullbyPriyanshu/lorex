import fs from 'fs';
import path from 'path';
import { scanStructure } from './scanners/structure';
import { scanPackage } from './scanners/package';
import { scanSchema } from './scanners/schema';
import { scanRoutes } from './scanners/routes';
import { scanEnv, toEnvKeys } from './scanners/env';
import { scanGit, scanGitCommits } from './scanners/git';
import { scanScripts } from './scanners/scripts';
import { scanDeployment } from './scanners/deployment';
import { scanNextJsRoutes, detectNextJsProject } from './scanners/nextjs-routes';
import { scanNextJsStructure } from './scanners/nextjs-structure';
import { scanAuth } from './scanners/auth';
import { scanComponents } from './scanners/components';
import { DatabaseSchema } from './scanners/schema';
import { NextJsRoutes } from './scanners/nextjs-routes';
import { EnvKey } from './scanners/env';
import { PackageInfo } from './scanners/package';
import { ComponentInfo } from './scanners/components';
import { Commit } from './scanners/git';

export interface ScanResult {
  packageInfo: PackageInfo;
  structure: string;
  schema: DatabaseSchema | null;
  envKeys: string[];
  routes: string[];
  gitLog: string[];
  scripts: Array<{ name: string; command: string }>;
  deployment: string | null;
  isNextJsProject: boolean;
  nextJsRoutes?: NextJsRoutes;
  nextJsStructure?: string;
  auth?: ReturnType<typeof scanAuth>;
  components?: ComponentInfo[];
  commits?: Commit[];
}

export async function scanProject(projectRoot: string): Promise<ScanResult> {
  const originalCwd = process.cwd();

  try {
    process.chdir(projectRoot);

    const packageInfo = scanPackage();
    const structure = scanStructure();
    const schema = await scanSchema();
    const envKeys = await scanEnv();
    const routes = await scanRoutes();
    const gitLog = scanGit();
    const scripts = scanScripts();
    const deployment = scanDeployment();

    const deps = {
      ...packageInfo.dependencies,
      ...packageInfo.devDependencies,
    };
    const isNextJsProject =
      detectNextJsProject(deps) &&
      (fs.existsSync(path.join(projectRoot, 'app')) ||
        fs.existsSync(path.join(projectRoot, 'pages')));

    let nextJsRoutes: NextJsRoutes | undefined;
    let nextJsStructure: string | undefined;
    let auth: ReturnType<typeof scanAuth> | undefined;
    let components: ComponentInfo[] | undefined;
    let commits: Commit[] | undefined;

    if (isNextJsProject) {
      try {
        nextJsRoutes = await scanNextJsRoutes();
      } catch {
        nextJsRoutes = { pageRoutes: [], apiRoutes: [], routerMode: [] };
      }

      try {
        nextJsStructure = scanNextJsStructure();
      } catch {
        nextJsStructure = '(Unable to scan Next.js structure)';
      }

      try {
        auth = scanAuth(projectRoot);
      } catch {
        auth = { authType: 'Error detecting auth', providers: [], configFiles: [] };
      }

      try {
        components = await scanComponents(projectRoot);
      } catch {
        components = [];
      }

      try {
        commits = scanGitCommits(5);
      } catch {
        commits = [];
      }
    }

    return {
      packageInfo,
      structure,
      schema,
      envKeys,
      routes,
      gitLog,
      scripts,
      deployment,
      isNextJsProject,
      nextJsRoutes,
      nextJsStructure,
      auth,
      components,
      commits,
    };
  } catch {
    return {
      packageInfo: {
        name: path.basename(projectRoot),
        description: '',
        dependencies: {},
        devDependencies: {},
        scripts: {},
        stack: [],
        projectType: 'Unknown',
      },
      structure: '',
      schema: null,
      envKeys: [],
      routes: [],
      gitLog: [],
      scripts: [],
      deployment: null,
      isNextJsProject: false,
    };
  } finally {
    process.chdir(originalCwd);
  }
}

export function getEnvKeysForMarkdown(envKeys: string[]): EnvKey[] {
  return toEnvKeys(envKeys);
}
