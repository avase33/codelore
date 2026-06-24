/**
 * String manipulation utilities for CodeLore
 */

/** Convert a camelCase or PascalCase string to kebab-case */
export function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/** Convert a snake_case string to camelCase */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** Truncate a string to maxLength, appending ellipsis if trimmed */
export function truncate(str: string, maxLength: number, ellipsis = '…'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/** Slugify a title string for use in URLs or file names */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^ws-]/g, '')
    .replace(/[s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Strip all HTML tags from a string */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}
