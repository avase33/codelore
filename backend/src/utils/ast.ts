/**
 * CodeLore -- AST Traversal Utilities
 */

export interface ASTNode {
  type: string;
  start?: number;
  end?: number;
  [key: string]: unknown;
}

export interface ParsedSymbol {
  name: string;
  type: 'function' | 'class' | 'variable';
  exported: boolean;
  line?: number;
}

export function extractFunctions(node: ASTNode, symbols: ParsedSymbol[] = []): ParsedSymbol[] {
  if (!node || typeof node !== 'object') return symbols;
  if (node.type === 'FunctionDeclaration' && (node as any).id?.name) {
    symbols.push({ name: (node as any).id.name, type: 'function', exported: false, line: node.start });
  }
  if (node.type === 'ExportNamedDeclaration' && (node as any).declaration?.type === 'FunctionDeclaration') {
    const decl = (node as any).declaration;
    if (decl.id?.name) symbols.push({ name: decl.id.name, type: 'function', exported: true });
  }
  for (const key of Object.keys(node)) {
    const child = (node as any)[key];
    if (Array.isArray(child)) child.forEach(c => extractFunctions(c, symbols));
    else if (child && typeof child === 'object' && child.type) extractFunctions(child, symbols);
  }
  return symbols;
}

export function countLOC(source: string): number {
  return source.split('\n').filter(line => {
    const t = line.trim();
    return t.length > 0 && !t.startsWith('//') && !t.startsWith('*');
  }).length;
}

export function extractDocComment(source: string, symbolLine: number): string | undefined {
  const lines = source.split('\n');
  const out: string[] = [];
  let i = symbolLine - 2;
  while (i >= 0 && (lines[i].trim().startsWith('*') || lines[i].trim().startsWith('/**'))) {
    out.unshift(lines[i].trim().replace(/^\/*\*+\/?/, '').trim());
    i--;
  }
  return out.length > 0 ? out.filter(Boolean).join(' ') : undefined;
}