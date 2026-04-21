import fs from 'fs';
import { ApiRoute, NextJsRoutes } from '../scanners/nextjs-routes';
import { AuthConfig } from '../scanners/auth';
import { ComponentInfo } from '../scanners/components';
import { DatabaseSchema } from '../scanners/schema';
import { GroupedDependencies } from '../utils/dependencies';
import { Commit } from '../scanners/git';

export interface NextJsMarkdownInput {
  projectName: string;
  projectDescription: string;
  nextJsRoutes: NextJsRoutes;
  structureTree: string;
  groupedPackages: GroupedDependencies;
  authConfig: AuthConfig;
  commits: Commit[];
  components: ComponentInfo[];
  schema: DatabaseSchema | null;
  envKeys: string[];
}

/**
 * Format the routes and API endpoints section
 */
function formatRoutesSection(routes: NextJsRoutes): string {
  const lines: string[] = [];
  lines.push('## 1. Routes & API Endpoints\n');

  // Page Routes
  if (routes.pageRoutes.length > 0) {
    lines.push('### Page Routes');
    for (const route of routes.pageRoutes) {
      lines.push(`- \`${route}\``);
    }
    lines.push('');
  }

  // API Routes
  if (routes.apiRoutes.length > 0) {
    lines.push('### API Routes');
    for (const route of routes.apiRoutes) {
      const methods = route.methods.join(', ');
      let line = `- \`${route.path}\` → ${methods}`;

      if (route.requestBodyFields && route.requestBodyFields.length > 0) {
        line += ` (body: ${route.requestBodyFields.join(', ')})`;
      }

      lines.push(line);
    }
    lines.push('');
  }

  // Middleware
  if (routes.middlewarePath) {
    lines.push('### Middleware');
    lines.push(`- **File:** \`${routes.middlewarePath}\``);
    if (routes.middlewareMatchers && routes.middlewareMatchers.length > 0) {
      lines.push(
        `- **Matchers:** ${routes.middlewareMatchers.map((m) => `\`${m}\``).join(', ')}`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format the file & folder tree section
 */
function formatStructureSection(tree: string): string {
  return `## 2. File & Folder Tree (App Router)\n\n${tree}\n\n`;
}

/**
 * Format the packages & dependencies section
 */
function formatPackagesSection(grouped: GroupedDependencies): string {
  const lines: string[] = [];
  lines.push('## 3. Packages & Dependencies\n');

  const categories: (keyof GroupedDependencies)[] = [
    'ui',
    'database',
    'auth',
    'stateManagement',
    'testing',
    'tooling',
    'other',
  ];
  const categoryLabels: Record<string, string> = {
    ui: 'UI & Styling',
    database: 'Database',
    auth: 'Authentication',
    stateManagement: 'State Management',
    testing: 'Testing',
    tooling: 'Tooling & Build',
    other: 'Other',
  };

  for (const category of categories) {
    const packages = grouped[category];
    if (Object.keys(packages).length === 0) continue;

    lines.push(`### ${categoryLabels[category]}`);
    for (const [name, version] of Object.entries(packages)) {
      lines.push(`- ${name} \`${version}\``);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format the authentication section
 */
function formatAuthSection(auth: AuthConfig): string {
  const lines: string[] = [];
  lines.push('## 4. Authentication\n');

  lines.push(`**Type:** ${auth.authType || 'None'}\n`);

  if (auth.providers && auth.providers.length > 0) {
    lines.push('**Providers:**');
    for (const provider of auth.providers) {
      lines.push(`- ${provider}`);
    }
    lines.push('');
  }

  if (auth.sessionStrategy) {
    lines.push(`**Session Strategy:** ${auth.sessionStrategy}\n`);
  }

  if (auth.configFiles && auth.configFiles.length > 0) {
    lines.push('**Config Files:**');
    for (const file of auth.configFiles) {
      lines.push(`- \`${file}\``);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format the git commits section
 */
function formatCommitsSection(commits: Commit[]): string {
  const lines: string[] = [];
  lines.push('## 5. Last 5 Git Commits\n');

  if (commits.length === 0) {
    lines.push('(No git history available)\n');
    return lines.join('\n');
  }

  for (const commit of commits) {
    lines.push(`- \`${commit.hash}\` · ${commit.message} · ${commit.date}`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Format the server vs client components section
 */
function formatComponentsSection(components: ComponentInfo[]): string {
  const lines: string[] = [];
  lines.push('## 6. Server vs Client Components\n');

  if (components.length === 0) {
    lines.push('(No components found in /app)\n');
    return lines.join('\n');
  }

  // Group by folder
  const byFolder: Record<string, ComponentInfo[]> = {};
  for (const comp of components) {
    if (!byFolder[comp.folder]) {
      byFolder[comp.folder] = [];
    }
    byFolder[comp.folder].push(comp);
  }

  const folders = Object.keys(byFolder).sort();
  for (const folder of folders) {
    lines.push(`### \`${folder}\``);
    for (const comp of byFolder[folder]) {
      lines.push(`- [${comp.type}] ${comp.file}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format data models section (Prisma, Mongoose, Drizzle)
 */
function formatModelsSection(schema: DatabaseSchema | null): string {
  const lines: string[] = [];
  lines.push('## 7. Data Models & Relations\n');

  if (!schema || schema.models.length === 0) {
    lines.push('(No database schema detected)\n');
    return lines.join('\n');
  }

  // List models
  for (const model of schema.models) {
    lines.push(`### ${model.name}`);
    lines.push('**Fields:**');
    for (const field of model.fields) {
      lines.push(`- ${field}`);
    }
    lines.push('');
  }

  // Show relations if any
  if (schema.relations && schema.relations.length > 0) {
    lines.push('### Relations');
    for (const relation of schema.relations) {
      lines.push(`- ${relation}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format environment variables section
 */
function formatEnvSection(envKeys: string[]): string {
  const lines: string[] = [];
  lines.push('## 8. Environment Variables\n');

  if (envKeys.length === 0) {
    lines.push('(No environment variables defined)\n');
    return lines.join('\n');
  }

  for (const key of envKeys) {
    lines.push(`- \`${key}\``);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate the complete lorex.md markdown content
 */
export function generateNextJsMarkdown(input: NextJsMarkdownInput): string {
  const sections: string[] = [];

  // Header
  sections.push(`# ${input.projectName}`);
  if (input.projectDescription) {
    sections.push(`\n${input.projectDescription}\n`);
  }
  sections.push('');

  // All 8 sections
  sections.push(formatRoutesSection(input.nextJsRoutes));
  sections.push(formatStructureSection(input.structureTree));
  sections.push(formatPackagesSection(input.groupedPackages));
  sections.push(formatAuthSection(input.authConfig));
  sections.push(formatCommitsSection(input.commits));
  sections.push(formatComponentsSection(input.components));
  sections.push(formatModelsSection(input.schema));
  sections.push(formatEnvSection(input.envKeys));

  // Footer
  sections.push('---');
  sections.push(`*Generated by [lorex-cli](https://github.com/justpriyanshu/lorex-cli)*`);

  return sections.join('\n');
}

/**
 * Write the markdown to lorex.md file
 */
export function writeLorexMarkdown(
  content: string,
  outputPath: string = 'lorex.md'
): void {
  fs.writeFileSync(outputPath, content, 'utf-8');
}
