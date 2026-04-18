import { PackageInfo } from './package';
import { DatabaseSchema } from './schema';

interface GeneratorInput {
  oneliner: string;
  packageInfo: PackageInfo;
  structure: string;
  schema: DatabaseSchema | null;
  envKeys: string[];
  routes: string[];
  gitLog: string[];
}

export function generateMarkdown(input: GeneratorInput): string {
  const lines: string[] = [];

  // Project title
  lines.push(`# ${input.packageInfo.name}\n`);

  // Description
  lines.push(`${input.oneliner}\n`);

  // Stack
  if (input.packageInfo.stack.length > 0) {
    lines.push('## Stack\n');
    lines.push(input.packageInfo.stack.map((s) => `- ${s}`).join('\n'));
    lines.push('');
  }

  // Folder Structure
  lines.push('## Folder Structure\n');
  lines.push(input.structure);
  lines.push('');

  // Database Models
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

  // Environment Keys
  if (input.envKeys.length > 0) {
    lines.push('## Environment Keys\n');
    lines.push('```');
    lines.push(input.envKeys.join('\n'));
    lines.push('```\n');
  }

  // Routes
  if (input.routes.length > 0) {
    lines.push('## Routes\n');
    lines.push(input.routes.map((r) => `- ${r}`).join('\n'));
    lines.push('');
  }

  // Recent Git Activity
  if (input.gitLog.length > 0) {
    lines.push('## Recent Git Activity\n');
    lines.push('```');
    lines.push(input.gitLog.join('\n'));
    lines.push('```\n');
  }

  return lines.join('\n');
}
