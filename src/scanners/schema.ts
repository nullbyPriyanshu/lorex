import fs from 'fs';
import path from 'path';

export interface DatabaseSchema {
  models: Array<{
    name: string;
    fields: string[];
  }>;
}

export function scanSchema(): DatabaseSchema | null {
  try {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

    if (!fs.existsSync(schemaPath)) {
      return null;
    }

    const content = fs.readFileSync(schemaPath, 'utf-8');
    const models: DatabaseSchema['models'] = [];

    // Parse Prisma schema
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = modelRegex.exec(content)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];

      // Extract field names
      const fieldLines = modelBody.split('\n');
      const fields: string[] = [];

      for (const line of fieldLines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('@@')) {
          const fieldMatch = /^(\w+)\s+/.exec(trimmed);
          if (fieldMatch) {
            fields.push(fieldMatch[1]);
          }
        }
      }

      models.push({ name: modelName, fields });
    }

    return { models };
  } catch {
    return null;
  }
}
