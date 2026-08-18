#!/usr/bin/env node

/**
 * Non-interactive scan helper for verification and CI.
 * Usage: npx ts-node scripts/scan-fixture.ts /path/to/project [oneliner]
 */

import fs from 'fs';
import path from 'path';
import { detectProjects } from '../src/utils/monorepo';
import { scanProject, getEnvKeysForMarkdown } from '../src/scan-project';
import { generateMarkdown } from '../src/generators/markdown';
import { generateNextJsMarkdown } from '../src/generators/nextjs-markdown';
import { groupDependencies } from '../src/utils/dependencies';

async function main() {
  const projectRoot = path.resolve(process.argv[2] || process.cwd());
  const oneliner = process.argv[3] || 'Sample project for lorex verification';

  const originalCwd = process.cwd();
  process.chdir(projectRoot);

  const targets = detectProjects(projectRoot);
  const outputs: string[] = [];

  for (const target of targets) {
    const result = await scanProject(target.root);
    let markdown: string;

    if (result.isNextJsProject && result.nextJsRoutes) {
      const grouped = groupDependencies(
        result.packageInfo.dependencies,
        result.packageInfo.devDependencies
      );
      markdown = generateNextJsMarkdown({
        projectName: result.packageInfo.name || path.basename(target.root),
        projectDescription: oneliner,
        nextJsRoutes: result.nextJsRoutes,
        structureTree: result.nextJsStructure || '',
        groupedPackages: grouped,
        authConfig: result.auth || { authType: 'None' },
        commits: result.commits || [],
        components: result.components || [],
        schema: result.schema,
        envKeys: getEnvKeysForMarkdown(result.envKeys),
      });
    } else {
      markdown = generateMarkdown({
        oneliner,
        packageInfo: result.packageInfo,
        structure: result.structure,
        schema: result.schema,
        envKeys: result.envKeys,
        routes: result.routes,
        gitLog: result.gitLog,
        scripts: result.scripts,
        deployment: result.deployment,
      });
    }

    const outputPath = path.join(projectRoot, target.outputFile);
    fs.writeFileSync(outputPath, markdown);
    outputs.push(outputPath);
  }

  process.chdir(originalCwd);

  console.log(JSON.stringify({ projectRoot, outputs, targets }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
