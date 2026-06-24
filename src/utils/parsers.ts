/**
 * Parsing utilities for CodeLore
 * Helpers for extracting structure and metadata from source code strings.
 */

/**
 * Extract all import statements from a TypeScript/JavaScript source string.
 * @param source - Raw source code
 * @returns Array of import statement strings
 */
export function extractImports(source: string): string[] {
  const re = /^imports+.+froms+['"].+['"];?$/gm;
  return source.match(re) ?? [];
}

/**
 * Extract exported function names from a TypeScript source string.
 * @param source - Raw TypeScript/JavaScript source
 */
export function extractExportedFunctions(source: string): string[] {
  const re = /exports+(?:asyncs+)?functions+(w+)/g;
  const names: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) names.push(m[1]);
  return names;
}

/**
 * Extract single-line (//) and JSDoc (/** ... */) comments from source.
 * @param source - Raw source code
 */
export function extractComments(source: string): string[] {
  const single = source.match(///.*$/gm) ?? [];
  const multi = source.match(//*[sS]*?*//g) ?? [];
  return [...single, ...multi];
}

/**
 * Count lines of code excluding blank lines and comment-only lines.
 * @param source - Raw source code
 */
export function countLinesOfCode(source: string): number {
  return source
    .split('
')
    .filter(l => l.trim().length > 0 && !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .length;
}

/**
 * Parse a simple key: value front-matter block from the top of a file.
 * @param source - File content string
 * @returns Record of parsed key/value pairs
 */
export function parseFrontMatter(source: string): Record<string, string> {
  const result: Record<string, string> = {};
  const match = source.match(/^---
([sS]*?)
---/);
  if (!match) return result;
  for (const line of match[1].split('
')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) result[key.trim()] = rest.join(':').trim();
  }
  return result;
}
