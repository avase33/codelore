// AST utilities -- 2026-07-13 17:45:16
import * as ts from 'typescript';

export interface FunctionInfo {
  name: string;
  params: string[];
  returnType: string;
  startLine: number;
  endLine: number;
  docComment?: string;
  isExported: boolean;
}

export interface FileAnalysis {
  filePath: string;
  functions: FunctionInfo[];
  imports: string[];
  exports: string[];
  linesOfCode: number;
  complexity: number;
}

export function analyzeFile(filePath: string, sourceCode: string): FileAnalysis {
  const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);
  const functions: FunctionInfo[] = [];
  const imports: string[] = [];
  const exports: string[] = [];
  let complexity = 1;

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      const mod = (node.moduleSpecifier as ts.StringLiteral).text;
      imports.push(mod);
    }
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node)) {
      const name = ts.isFunctionDeclaration(node) && node.name ? node.name.text : '<anonymous>';
      const isExported = !!(ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export);
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
      functions.push({ name, params: [], returnType: 'unknown', startLine: start.line + 1, endLine: end.line + 1, isExported });
    }
    if (ts.isIfStatement(node) || ts.isWhileStatement(node) || ts.isForStatement(node)) complexity++;
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return { filePath, functions, imports, exports, linesOfCode: sourceCode.split('\\n').length, complexity };
}