#!/usr/bin/env node
"use strict";
/**
 * Non-interactive scan helper for verification and CI.
 * Usage: npx ts-node scripts/scan-fixture.ts /path/to/project [oneliner]
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const monorepo_1 = require("../src/utils/monorepo");
const scan_project_1 = require("../src/scan-project");
const markdown_1 = require("../src/generators/markdown");
const nextjs_markdown_1 = require("../src/generators/nextjs-markdown");
const dependencies_1 = require("../src/utils/dependencies");
async function main() {
    const projectRoot = path_1.default.resolve(process.argv[2] || process.cwd());
    const oneliner = process.argv[3] || 'Sample project for lorex verification';
    const originalCwd = process.cwd();
    process.chdir(projectRoot);
    const targets = (0, monorepo_1.detectProjects)(projectRoot);
    const outputs = [];
    for (const target of targets) {
        const result = await (0, scan_project_1.scanProject)(target.root);
        let markdown;
        if (result.isNextJsProject && result.nextJsRoutes) {
            const grouped = (0, dependencies_1.groupDependencies)(result.packageInfo.dependencies, result.packageInfo.devDependencies);
            markdown = (0, nextjs_markdown_1.generateNextJsMarkdown)({
                projectName: result.packageInfo.name || path_1.default.basename(target.root),
                projectDescription: oneliner,
                nextJsRoutes: result.nextJsRoutes,
                structureTree: result.nextJsStructure || '',
                groupedPackages: grouped,
                authConfig: result.auth || { authType: 'None' },
                commits: result.commits || [],
                components: result.components || [],
                schema: result.schema,
                envKeys: (0, scan_project_1.getEnvKeysForMarkdown)(result.envKeys),
            });
        }
        else {
            markdown = (0, markdown_1.generateMarkdown)({
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
        const outputPath = path_1.default.join(projectRoot, target.outputFile);
        fs_1.default.writeFileSync(outputPath, markdown);
        outputs.push(outputPath);
    }
    process.chdir(originalCwd);
    console.log(JSON.stringify({ projectRoot, outputs, targets }, null, 2));
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
