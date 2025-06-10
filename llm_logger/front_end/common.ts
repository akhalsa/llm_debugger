// Common utility functions shared between index.ts and viewer.ts

/**
 * Escapes HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  return (str || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[m] || m);
}

/**
 * Constructs an API URL with the base URL prefix
 */
export function apiUrl(path: string): string {
  const base = (window as any).BASE_URL || '';
  return `${base}${path}`;
}

/**
 * Formats JSON for pretty printing
 */
export function prettyPrintJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
