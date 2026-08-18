import fs from 'fs';
import path from 'path';
import ts from 'typescript';

export function parseSourceFile(filePath: string): ts.SourceFile | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const scriptKind = filePath.endsWith('.tsx') || filePath.endsWith('.jsx')
      ? ts.ScriptKind.TSX
      : filePath.endsWith('.js') || filePath.endsWith('.jsx')
      ? ts.ScriptKind.JS
      : ts.ScriptKind.TS;

    return ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    );
  } catch {
    return null;
  }
}

export function getDecorators(node: ts.Node): readonly ts.Decorator[] {
  if (!ts.canHaveDecorators(node)) {
    return [];
  }
  return ts.getDecorators(node) || [];
}

export function getDecoratorName(decorator: ts.Decorator): string | null {
  const expression = decorator.expression;
  if (ts.isCallExpression(expression)) {
    return expression.expression.getText();
  }
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  return null;
}

export function getDecoratorStringArg(decorator: ts.Decorator): string | null {
  const expression = decorator.expression;
  if (!ts.isCallExpression(expression) || expression.arguments.length === 0) {
    return null;
  }

  const arg = expression.arguments[0];
  if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
    return arg.text;
  }

  return null;
}

export function getTypeAnnotationText(node: ts.PropertyDeclaration | ts.ParameterDeclaration): string {
  if (!node.type) {
    return 'unknown';
  }
  return node.type.getText().trim();
}

export function hasDirective(sourceFile: ts.SourceFile, directive: string): boolean {
  for (const statement of sourceFile.statements) {
    if (!ts.isExpressionStatement(statement)) {
      continue;
    }

    const expression = statement.expression;
    if (
      ts.isStringLiteral(expression) ||
      ts.isNoSubstitutionTemplateLiteral(expression)
    ) {
      if (expression.text === directive) {
        return true;
      }
      continue;
    }

    break;
  }

  return false;
}

export function walkNodes(
  node: ts.Node,
  visitor: (node: ts.Node) => void
): void {
  visitor(node);
  ts.forEachChild(node, (child) => walkNodes(child, visitor));
}

export function findClassDeclarations(sourceFile: ts.SourceFile): ts.ClassDeclaration[] {
  const classes: ts.ClassDeclaration[] = [];
  walkNodes(sourceFile, (node) => {
    if (ts.isClassDeclaration(node)) {
      classes.push(node);
    }
  });
  return classes;
}

export function findExportedFunctions(sourceFile: ts.SourceFile): ts.FunctionDeclaration[] {
  const functions: ts.FunctionDeclaration[] = [];
  walkNodes(sourceFile, (node) => {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      functions.push(node);
    }
  });
  return functions;
}

export function findExportedConstNames(sourceFile: ts.SourceFile): string[] {
  const names: string[] = [];
  walkNodes(sourceFile, (node) => {
    if (!ts.isVariableStatement(node)) return;
    const isExported = node.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
    );
    if (!isExported) return;

    for (const declaration of node.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) {
        names.push(declaration.name.text);
      }
    }
  });
  return names;
}

export function readFileContent(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

export function resolveImportPath(
  fromFile: string,
  importPath: string,
  projectRoot: string
): string | null {
  if (!importPath.startsWith('.')) {
    return null;
  }

  const base = path.resolve(path.dirname(fromFile), importPath);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}
