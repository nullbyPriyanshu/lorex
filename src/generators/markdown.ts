import { PackageInfo } from '../scanners/package';
import { DatabaseSchema } from '../scanners/schema';

interface GeneratorInput {
  oneliner: string;
  packageInfo: PackageInfo;
  structure: string;
  schema: DatabaseSchema | null;
  envKeys: string[];
  routes: string[];
  gitLog: string[];
}

function getTopDependencies(
  packageInfo: PackageInfo,
  limit: number = 8
): Array<{ name: string; version: string }> {
  const deps = {
    ...packageInfo.dependencies,
    ...packageInfo.devDependencies,
  };

  // Filter out @types and other utility packages, prioritize framework/DB packages
  const important = [
    'next',
    'express',
    '@nestjs/core',
    'fastify',
    'koa',
    '@prisma/client',
    'mongoose',
    'typeorm',
    'sequelize',
    'graphql',
    'apollo-server',
    'react',
    'vue',
    'svelte',
    'nuxt',
    'commander',
    'chalk',
    'lodash',
    'axios',
    'socket.io',
    'ws',
    'passport',
    'jsonwebtoken',
    'dotenv',
  ];

  const noisePackages = [
    'lorex-cli',
    'nodemon',
    'ts-node',
    'typescript',
    '@types/node',
    '@types/react',
    '@types/react-dom',
    'eslint',
    'prettier',
    'jest',
    'vitest',
  ];

  const prioritized = important.filter((pkg) => deps[pkg]);
  const rest = Object.keys(deps).filter(
    (pkg) =>
      !important.includes(pkg) &&
      !pkg.startsWith('@types') &&
      !pkg.startsWith('@clack') &&
      !noisePackages.includes(pkg)
  );

  const topDeps = prioritized.concat(rest).slice(0, limit);

  return topDeps.map((name) => ({
    name,
    version: deps[name],
  }));
}

function formatStackSection(packageInfo: PackageInfo): string {
  const lines: string[] = [];
  const stack = packageInfo.stack || [];

  if (stack.length === 0) {
    lines.push('- **Runtime:** Vanilla HTML/CSS/JS');
    return lines.join('\n');
  }

  const hasNode = stack.includes('Node.js');
  const hasTypeScript = stack.includes('TypeScript');
  const runtime = hasNode
    ? hasTypeScript
      ? 'Node.js + TypeScript'
      : 'Node.js'
    : hasTypeScript
    ? 'TypeScript'
    : 'Vanilla HTML/CSS/JS';

  lines.push(`- **Runtime:** ${runtime}`);

  const stackDetails = stack.filter((item) => item !== 'Node.js' && item !== 'TypeScript');
  if (stackDetails.length > 0) {
    lines.push(`- **Stack:** ${stackDetails.join(', ')}`);
  }

  const deps = {
    ...packageInfo.dependencies,
    ...packageInfo.devDependencies,
  };

  // Framework
  const frameworks = [];
  if (deps['next']) frameworks.push(`Next.js@${deps['next']}`);
  if (deps['express']) frameworks.push(`Express@${deps['express']}`);
  if (deps['@nestjs/core']) frameworks.push(`NestJS@${deps['@nestjs/core']}`);
  if (deps['fastify']) frameworks.push(`Fastify@${deps['fastify']}`);
  if (deps['koa']) frameworks.push(`Koa@${deps['koa']}`);
  if (frameworks.length > 0) {
    lines.push(`- **Framework:** ${frameworks.join(', ')}`);
  }

  // Database
  const databases = [];
  if (deps['@prisma/client'])
    databases.push(`Prisma@${deps['@prisma/client']}`);
  if (deps['mongoose']) databases.push(`MongoDB (Mongoose)@${deps['mongoose']}`);
  if (deps['typeorm']) databases.push(`TypeORM@${deps['typeorm']}`);
  if (deps['sequelize']) databases.push(`Sequelize@${deps['sequelize']}`);
  if (databases.length > 0) {
    lines.push(`- **Database:** ${databases.join(', ')}`);
  }

  // Auth
  const auth = [];
  if (deps['next-auth'])
    auth.push(`NextAuth@${deps['next-auth']}`);
  if (deps['passport'])
    auth.push(`Passport@${deps['passport']}`);
  if (deps['jsonwebtoken'])
    auth.push(`JWT@${deps['jsonwebtoken']}`);
  if (auth.length > 0) {
    lines.push(`- **Auth:** ${auth.join(', ')}`);
  }

  // Real-time
  if (deps['socket.io'] || deps['ws']) {
    const realtime = [];
    if (deps['socket.io']) realtime.push(`Socket.IO@${deps['socket.io']}`);
    if (deps['ws']) realtime.push(`WebSocket@${deps['ws']}`);
    lines.push(`- **Real-time:** ${realtime.join(', ')}`);
  }

  // GraphQL
  if (deps['graphql'] || deps['apollo-server']) {
    const gql = [];
    if (deps['graphql']) gql.push(`GraphQL@${deps['graphql']}`);
    if (deps['apollo-server'])
      gql.push(`Apollo@${deps['apollo-server']}`);
    lines.push(`- **GraphQL:** ${gql.join(', ')}`);
  }

  return lines.join('\n');
}

function addFolderDescriptions(structure: string): string {
  const descriptions: Record<string, string> = {
    'commands': 'CLI command implementations',
    'scanners': 'Project analysis tools',
    'generators': 'Output generators',
    'utils': 'Shared utilities',
    'api': 'API routes',
    'app': 'Next.js app directory',
    'pages': 'Next.js pages',
    'components': 'React components',
    'lib': 'Library functions',
    'types': 'TypeScript types',
    'src': 'Source code',
  };

  let result = structure;

  for (const [folder, description] of Object.entries(descriptions)) {
    // Match folder names and add description only once
    const regex = new RegExp(
      `(📁 ${folder})\\b(?! —)`,
      'g'
    );
    result = result.replace(regex, `$1 — ${description}`);
  }

  return result;
}

export function generateMarkdown(input: GeneratorInput): string {
  const lines: string[] = [];

  // Project title
  lines.push(`# ${input.packageInfo.name}\n`);

  // Description
  lines.push(`${input.oneliner}\n`);

  // Stack (with versions and auto-detection)
  const stackContent = formatStackSection(input.packageInfo);
  if (stackContent) {
    lines.push('## Stack\n');
    lines.push(stackContent);
    lines.push('');
  }

  // Key Dependencies
  const deps = getTopDependencies(input.packageInfo);
  if (deps.length > 0) {
    lines.push('## Key Dependencies\n');
    for (const dep of deps) {
      lines.push(`- **${dep.name}** — ${dep.version}`);
    }
    lines.push('');
  }

  // Folder Structure with descriptions
  lines.push('## Folder Structure\n');
  const enhancedStructure = addFolderDescriptions(input.structure);
  lines.push(enhancedStructure);
  lines.push('');

  // Database Models (only if exists)
  if (
    input.schema &&
    input.schema.models &&
    input.schema.models.length > 0
  ) {
    lines.push('## Database Models\n');
    for (const model of input.schema.models) {
      lines.push(`### ${model.name}`);
      lines.push('```');
      lines.push(model.fields.join('\n'));
      lines.push('```\n');
    }
  }

  // Environment Keys (only if exists)
  if (input.envKeys.length > 0) {
    lines.push('## Environment Variables\n');
    lines.push(input.envKeys.map((key) => `- \`${key}\``).join('\n'));
    lines.push('');
  }

  // Routes (only if exists)
  if (input.routes.length > 0) {
    lines.push('## API Routes\n');
    lines.push(input.routes.map((r) => `- \`${r}\``).join('\n'));
    lines.push('');
  }

  // Recent Git Activity (only if exists, with bullet formatting)
  if (input.gitLog.length > 0) {
    lines.push('## Recent Git Activity\n');
    for (const commit of input.gitLog) {
      lines.push(`• ${commit}`);
    }
    lines.push('');
  }

  // Generated timestamp
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  lines.push('---');
  lines.push(`Generated by **lorex** • ${dateStr} ${timeStr}`);

  return lines.join('\n');
}
