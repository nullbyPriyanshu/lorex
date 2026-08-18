import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { collectSourceFiles } from '../utils/monorepo';
import { joinRoutePaths, resolveSourceDir, isInsideNodeModules } from '../utils/paths';
import { dedupeByKey, dedupeRoutes } from '../utils/dedupe';
import {
  findClassDeclarations,
  getDecoratorName,
  getDecorators,
  getDecoratorStringArg,
  getTypeAnnotationText,
  parseSourceFile,
  readFileContent,
  resolveImportPath,
  walkNodes,
} from '../utils/typescript';

const ENTITY_DECORATOR = 'Entity';
const CONTROLLER_DECORATOR = 'Controller';
const HTTP_METHODS = new Set([
  'Get',
  'Post',
  'Put',
  'Delete',
  'Patch',
  'Options',
  'Head',
  'All',
]);
const COLUMN_DECORATORS = new Set([
  'Column',
  'PrimaryGeneratedColumn',
  'PrimaryColumn',
  'CreateDateColumn',
  'UpdateDateColumn',
  'DeleteDateColumn',
  'VersionColumn',
]);
const RELATION_DECORATORS = new Set([
  'OneToMany',
  'ManyToOne',
  'ManyToMany',
  'OneToOne',
]);
const VALIDATOR_DECORATORS = new Set([
  'IsString',
  'IsNumber',
  'IsBoolean',
  'IsOptional',
  'IsEmail',
  'IsArray',
  'IsInt',
  'IsUUID',
  'MinLength',
  'MaxLength',
  'ValidateNested',
]);

export interface NestEntity {
  name: string;
  fields: string[];
  sourceKey: string;
}

export interface NestRoute {
  method: string;
  path: string;
  bodyFields?: string[];
}

function classHasDecorator(classNode: ts.ClassDeclaration, decoratorName: string): boolean {
  return getDecorators(classNode).some(
    (decorator) => getDecoratorName(decorator) === decoratorName
  );
}

function getClassDecoratorArg(classNode: ts.ClassDeclaration, decoratorName: string): string {
  for (const decorator of getDecorators(classNode)) {
    if (getDecoratorName(decorator) !== decoratorName) continue;
    return getDecoratorStringArg(decorator) || '';
  }
  return '';
}

function extractEntityFields(classNode: ts.ClassDeclaration): string[] {
  const fields: string[] = [];

  for (const member of classNode.members) {
    if (!ts.isPropertyDeclaration(member) || !member.name) continue;

    const propertyName = member.name.getText();
    const decorators = getDecorators(member);
    const decoratorNames = decorators
      .map((decorator) => getDecoratorName(decorator))
      .filter((name): name is string => Boolean(name));

    const isEntityField = decoratorNames.some(
      (name) => COLUMN_DECORATORS.has(name) || RELATION_DECORATORS.has(name)
    );

    if (!isEntityField) continue;

    const typeText = getTypeAnnotationText(member);
    fields.push(`${propertyName}: ${typeText}`);
  }

  return fields;
}

function extractDtoFields(classNode: ts.ClassDeclaration): string[] {
  const fields: string[] = [];

  for (const member of classNode.members) {
    if (!ts.isPropertyDeclaration(member) || !member.name) continue;

    const propertyName = member.name.getText();
    const decorators = getDecorators(member);
    const hasValidator = decorators.some((decorator) => {
      const name = getDecoratorName(decorator);
      return name ? VALIDATOR_DECORATORS.has(name) : false;
    });

    if (!hasValidator) continue;

    const typeText = getTypeAnnotationText(member);
    fields.push(`${propertyName}: ${typeText}`);
  }

  return fields;
}

function findDtoClassByName(
  className: string,
  sourceFiles: string[],
  cache: Map<string, ts.SourceFile | null>
): ts.ClassDeclaration | null {
  for (const filePath of sourceFiles) {
    if (!cache.has(filePath)) {
      cache.set(filePath, parseSourceFile(filePath));
    }
    const sourceFile = cache.get(filePath);
    if (!sourceFile) continue;

    for (const classNode of findClassDeclarations(sourceFile)) {
      if (classNode.name?.text === className) {
        return classNode;
      }
    }
  }
  return null;
}

function resolveBodyTypeName(method: ts.MethodDeclaration): string | null {
  for (const parameter of method.parameters) {
    const hasBodyDecorator = getDecorators(parameter).some(
      (decorator) => getDecoratorName(decorator) === 'Body'
    );
    if (!hasBodyDecorator || !parameter.type) continue;

    const typeText = parameter.type.getText().trim();
    return typeText.replace(/\[\]$/, '');
  }
  return null;
}

function extractRoutesFromFile(
  filePath: string,
  globalPrefix: string,
  sourceFiles: string[],
  sourceCache: Map<string, ts.SourceFile | null>
): NestRoute[] {
  const sourceFile = parseSourceFile(filePath);
  if (!sourceFile) return [];

  const routes: NestRoute[] = [];

  for (const classNode of findClassDeclarations(sourceFile)) {
    if (!classHasDecorator(classNode, CONTROLLER_DECORATOR)) continue;

    const controllerBase = getClassDecoratorArg(classNode, CONTROLLER_DECORATOR);

    for (const member of classNode.members) {
      if (!ts.isMethodDeclaration(member)) continue;

      for (const decorator of getDecorators(member)) {
        const decoratorName = getDecoratorName(decorator);
        if (!decoratorName || !HTTP_METHODS.has(decoratorName)) continue;

        const methodPath = getDecoratorStringArg(decorator) || '';
        const fullPath = joinRoutePaths(globalPrefix, controllerBase, methodPath);

        const route: NestRoute = {
          method: decoratorName.toUpperCase(),
          path: fullPath,
        };

        const dtoClassName = resolveBodyTypeName(member);
        if (dtoClassName) {
          const dtoClass = findDtoClassByName(dtoClassName, sourceFiles, sourceCache);
          if (dtoClass) {
            const bodyFields = extractDtoFields(dtoClass);
            if (bodyFields.length > 0) {
              route.bodyFields = bodyFields;
            }
          }
        }

        routes.push(route);
      }
    }
  }

  return routes;
}

function extractGlobalPrefix(projectRoot: string, sourceFiles: string[]): string {
  for (const filePath of sourceFiles) {
    const basename = path.basename(filePath);
    if (basename !== 'main.ts' && basename !== 'main.js') continue;

    const content = readFileContent(filePath);
    const match = content.match(
      /\.setGlobalPrefix\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/
    );
    if (match) {
      return match[1];
    }
  }
  return '';
}

export async function scanNestEntities(projectRoot: string): Promise<NestEntity[]> {
  const sourceDir = resolveSourceDir(projectRoot);
  const sourceFiles = await collectSourceFiles(projectRoot, sourceDir);
  const entities: NestEntity[] = [];

  for (const filePath of sourceFiles) {
    if (isInsideNodeModules(filePath)) continue;

    const sourceFile = parseSourceFile(filePath);
    if (!sourceFile) continue;

    for (const classNode of findClassDeclarations(sourceFile)) {
      if (!classHasDecorator(classNode, ENTITY_DECORATOR) || !classNode.name) continue;

      const fields = extractEntityFields(classNode);
      entities.push({
        name: classNode.name.text,
        fields,
        sourceKey: `${path.resolve(filePath)}::${classNode.name.text}`,
      });
    }
  }

  return dedupeByKey(entities, (entity) => entity.sourceKey);
}

export async function scanNestRoutes(projectRoot: string): Promise<string[]> {
  const sourceDir = resolveSourceDir(projectRoot);
  const sourceFiles = await collectSourceFiles(projectRoot, sourceDir);
  const globalPrefix = extractGlobalPrefix(projectRoot, sourceFiles);
  const sourceCache = new Map<string, ts.SourceFile | null>();
  const routes: NestRoute[] = [];

  for (const filePath of sourceFiles) {
    if (isInsideNodeModules(filePath)) continue;
    routes.push(...extractRoutesFromFile(filePath, globalPrefix, sourceFiles, sourceCache));
  }

  const formatted = routes.map((route) => {
    if (route.bodyFields && route.bodyFields.length > 0) {
      return `${route.method} ${route.path} (body: ${route.bodyFields.join(', ')})`;
    }
    return `${route.method} ${route.path}`;
  });

  return dedupeRoutes(formatted);
}

export function isNestProject(deps: Record<string, string>): boolean {
  return Boolean(deps['@nestjs/core']);
}
