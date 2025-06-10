// Common utility functions shared between index.ts and viewer.ts
/**
 * Escapes HTML special characters to prevent XSS
 */
export function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, m => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[m] || m);
}
/**
 * Constructs an API URL with the base URL prefix
 */
export function apiUrl(path) {
    const base = window.BASE_URL || '';
    return `${base}${path}`;
}
/**
 * Formats JSON for pretty printing
 */
export function prettyPrintJson(str) {
    try {
        return JSON.stringify(JSON.parse(str), null, 2);
    }
    catch (_a) {
        return str;
    }
}
/**
 * Capitalizes the first letter of a string
 */
export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
