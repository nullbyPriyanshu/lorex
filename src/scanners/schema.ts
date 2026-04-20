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
    const cwd = process.cwd();

    // Check for Prisma schema
    const prismaSchemaPath = path.join(cwd, 'prisma', 'schema.prisma');
    if (fs.existsSync(prismaSchemaPath)) {
      return scanPrismaSchema(prismaSchemaPath);
    }

    // Check for Mongoose models
    const mongooseModels = scanMongooseModels(cwd);
    if (mongooseModels.models.length > 0) {
      return mongooseModels;
    }

    // Check for TypeORM entities
    const typeormEntities = scanTypeORMEntities(cwd);
    if (typeormEntities.models.length > 0) {
      return typeormEntities;
    }

    // Check for Sequelize models
    const sequelizeModels = scanSequelizeModels(cwd);
    if (sequelizeModels.models.length > 0) {
      return sequelizeModels;
    }

    return null;
  } catch {
    return null;
  }
}

function scanPrismaSchema(schemaPath: string): DatabaseSchema {
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
}

function scanMongooseModels(cwd: string): DatabaseSchema {
  const models: DatabaseSchema['models'] = [];
  const relations: string[] = [];

  try {
    const files = fs.readdirSync(cwd, { recursive: true })
      .filter((file) => typeof file === 'string' && (file.endsWith('.ts') || file.endsWith('.js')))
      .map((file) => path.join(cwd, file as string))
      .filter((filePath) => fs.statSync(filePath).isFile());

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Look for mongoose.Schema definitions
        const schemaRegex = /new\s+Schema\s*\(\s*\{([^}]+)\}/g;
        let schemaMatch;
        while ((schemaMatch = schemaRegex.exec(content)) !== null) {
          const schemaBody = schemaMatch[1];
          const fields: string[] = [];

          // Extract field names
          const fieldRegex = /(\w+):\s*\{/g;
          let fieldMatch;
          while ((fieldMatch = fieldRegex.exec(schemaBody)) !== null) {
            fields.push(fieldMatch[1]);
          }

          // Try to find model name
          const modelRegex = /mongoose\.model\s*\(\s*['"`]([^'"`]+)['"`]/g;
          const modelMatch = modelRegex.exec(content);
          if (modelMatch) {
            models.push({ name: modelMatch[1], fields });
          }
        }
      } catch {
        // Ignore read errors
      }
    }
  } catch {
    // Ignore directory read errors
  }

  return { models, relations };
}

function scanTypeORMEntities(cwd: string): DatabaseSchema {
  const models: DatabaseSchema['models'] = [];
  const relations: string[] = [];

  try {
    const files = fs.readdirSync(cwd, { recursive: true })
      .filter((file) => typeof file === 'string' && (file.endsWith('.ts') || file.endsWith('.js')))
      .map((file) => path.join(cwd, file as string))
      .filter((filePath) => fs.statSync(filePath).isFile());

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Look for @Entity decorated classes
        if (content.includes('@Entity')) {
          const classRegex = /class\s+(\w+)/g;
          const classMatch = classRegex.exec(content);
          if (classMatch) {
            const className = classMatch[1];
            const fields: string[] = [];

            // Extract @Column decorated properties
            const columnRegex = /@Column\s*\([^)]*\)\s*\w+\s*:\s*(\w+)/g;
            let columnMatch;
            while ((columnMatch = columnRegex.exec(content)) !== null) {
              fields.push(columnMatch[1]);
            }

            models.push({ name: className, fields });
          }
        }
      } catch {
        // Ignore read errors
      }
    }
  } catch {
    // Ignore directory read errors
  }

  return { models, relations };
}

function scanSequelizeModels(cwd: string): DatabaseSchema {
  const models: DatabaseSchema['models'] = [];
  const relations: string[] = [];

  try {
    const files = fs.readdirSync(cwd, { recursive: true })
      .filter((file) => typeof file === 'string' && (file.endsWith('.ts') || file.endsWith('.js')))
      .map((file) => path.join(cwd, file as string))
      .filter((filePath) => fs.statSync(filePath).isFile());

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Look for sequelize.define calls
        const defineRegex = /sequelize\.define\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{([^}]+)\}/g;
        let defineMatch;
        while ((defineMatch = defineRegex.exec(content)) !== null) {
          const modelName = defineMatch[1];
          const modelBody = defineMatch[2];
          const fields: string[] = [];

          // Extract field definitions
          const fieldRegex = /(\w+):\s*\{/g;
          let fieldMatch;
          while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
            fields.push(fieldMatch[1]);
          }

          models.push({ name: modelName, fields });
        }
      } catch {
        // Ignore read errors
      }
    }
  } catch {
    // Ignore directory read errors
  }

  return { models, relations };
}
