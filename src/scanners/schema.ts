import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { collectSourceFiles } from '../utils/monorepo';
import { resolveSourceDir, isInsideNodeModules } from '../utils/paths';
import { dedupeModels } from '../utils/dedupe';
import { isNestProject, scanNestEntities } from './nestjs';
import { parseSourceFile, readFileContent } from '../utils/typescript';
import { isScannableSourceFile } from '../utils/ignore';

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
        const fieldMatch = /^(\w+)\s+([\w\[\]?]+)/.exec(trimmed);
        if (fieldMatch) {
          fields.push(`${fieldMatch[1]}: ${fieldMatch[2]}`);

          const fieldType = fieldMatch[2];
          const relationTargetMatch = fieldType.match(/^([A-Z][A-Za-z0-9_]*)\[\]/);
          if (relationTargetMatch) {
            relations.push(`${modelName} → has many ${capitalize(fieldMatch[1])}`);
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

async function scanMongooseModels(projectRoot: string): Promise<DatabaseSchema> {
  const models: Array<{ name: string; fields: string[]; sourceKey?: string }> = [];
  const relations: string[] = [];
  const sourceDir = resolveSourceDir(projectRoot);

  const modelDirs = [
    path.join(sourceDir, 'models'),
    path.join(projectRoot, 'models'),
  ].filter((dir) => fs.existsSync(dir));

  const filesToScan = new Set<string>();
  for (const dir of modelDirs) {
    const files = await glob('**/*.{ts,js}', {
      cwd: dir,
      absolute: true,
      ignore: ['**/node_modules/**'],
    });
    for (const file of files) {
      if (isScannableSourceFile(file) && !isInsideNodeModules(file)) {
        filesToScan.add(file);
      }
    }
  }

  for (const filePath of filesToScan) {
    try {
      const content = readFileContent(filePath);
      const schemaRegex = /new\s+(?:mongoose\.)?Schema\s*\(\s*\{([\s\S]*?)\}\s*[,)]/g;
      let schemaMatch;

      while ((schemaMatch = schemaRegex.exec(content)) !== null) {
        const schemaBody = schemaMatch[1];
        const fields: string[] = [];
        const simpleFieldRegex = /^\s*(\w+)\s*:/gm;
        let fieldMatch;

        while ((fieldMatch = simpleFieldRegex.exec(schemaBody)) !== null) {
          const fieldName = fieldMatch[1];
          if (!fields.includes(fieldName)) {
            fields.push(`${fieldName}: unknown`);
          }
        }

        if (fields.length === 0) continue;

        const modelRegex = /mongoose\.model\s*\(\s*['"`]([^'"`]+)['"`]/;
        const modelMatch = modelRegex.exec(content);
        const schemaVarRegex = /const\s+(\w+Schema)\s*=\s*new\s+(?:mongoose\.)?Schema/;
        const schemaVarMatch = schemaVarRegex.exec(content);
        const modelName = modelMatch?.[1] || schemaVarMatch?.[1]?.replace(/Schema$/, '') || 'Model';

        models.push({
          name: modelName,
          fields,
          sourceKey: `${path.resolve(filePath)}::${modelName}`,
        });
      }
    } catch {
      // ignore file read errors
    }
  }

  return { models: dedupeModels(models), relations };
}

async function scanSequelizeModels(projectRoot: string): Promise<DatabaseSchema> {
  const models: Array<{ name: string; fields: string[]; sourceKey?: string }> = [];
  const relations: string[] = [];
  const sourceFiles = await collectSourceFiles(projectRoot, resolveSourceDir(projectRoot));

  for (const filePath of sourceFiles) {
    try {
      const content = readFileContent(filePath);
      const defineRegex = /sequelize\.define\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{([\s\S]*?)\}/g;
      let defineMatch;

      while ((defineMatch = defineRegex.exec(content)) !== null) {
        const modelName = defineMatch[1];
        const modelBody = defineMatch[2];
        const fields: string[] = [];
        const fieldRegex = /(\w+):\s*\{/g;
        let fieldMatch;

        while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
          fields.push(`${fieldMatch[1]}: unknown`);
        }

        models.push({
          name: modelName,
          fields,
          sourceKey: `${path.resolve(filePath)}::${modelName}`,
        });
      }
    } catch {
      // ignore
    }
  }

  return { models: dedupeModels(models), relations };
}

export async function scanSchema(): Promise<DatabaseSchema | null> {
  try {
    const cwd = process.cwd();
    const packagePath = path.join(cwd, 'package.json');
    let deps: Record<string, string> = {};

    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    }

    const prismaSchemaPath = path.join(cwd, 'prisma', 'schema.prisma');
    if (fs.existsSync(prismaSchemaPath)) {
      return scanPrismaSchema(prismaSchemaPath);
    }

    if (isNestProject(deps) || deps.typeorm) {
      const entities = await scanNestEntities(cwd);
      if (entities.length > 0) {
        return {
          models: dedupeModels(entities),
          relations: [],
        };
      }
    }

    const mongooseModels = await scanMongooseModels(cwd);
    if (mongooseModels.models.length > 0) {
      return mongooseModels;
    }

    const sequelizeModels = await scanSequelizeModels(cwd);
    if (sequelizeModels.models.length > 0) {
      return sequelizeModels;
    }

    return null;
  } catch {
    return null;
  }
}
