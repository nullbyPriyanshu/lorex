import fs from 'fs';
import path from 'path';

export interface DatabaseSchema {
  models: Array<{
    name: string;
    fields: string[];
  }>;
  relations: string[];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function scanSchema(): DatabaseSchema | null {
  try {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

    if (!fs.existsSync(schemaPath)) {
      return null;
    }

    const content = fs.readFileSync(schemaPath, 'utf-8');
    const models: DatabaseSchema['models'] = [];
    const relations: string[] = [];

    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = modelRegex.exec(content)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];
      const fieldLines = modelBody.split('\n');
      const fields: string[] = [];

      for (const line of fieldLines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('@@')) {
          const fieldMatch = /^(\w+)\s+([\w\[\]]+)/.exec(trimmed);
          if (fieldMatch) {
            const fieldName = fieldMatch[1];
            const fieldType = fieldMatch[2];
            fields.push(fieldName);

            const relationTargetMatch = fieldType.match(/^([A-Z][A-Za-z0-9_]*)\[\]$/);
            if (relationTargetMatch) {
              relations.push(
                `${modelName} → has many ${capitalize(fieldName)}`
              );
            } else if (/^[A-Z][A-Za-z0-9_]*$/.test(fieldType) && fieldType !== modelName) {
              if (trimmed.includes('@relation')) {
                relations.push(`${modelName} → belongs to ${fieldType}`);
              }
            }
          }
        }
      }

      models.push({ name: modelName, fields });
    }

    return { models, relations };
  } catch {
    return null;
  }
}
