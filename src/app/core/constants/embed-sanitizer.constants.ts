/**
 * DOMPurify allow-list for tenant-provided embed code (header + footer).
 * Canonical source: architecture.md §6 (allow-list de sanitización).
 * Shared by EUDISTACK-605 (header) and EUDISTACK-606 (footer) — do not duplicate.
 *
 * Prohibited (implicit — not in these lists):
 *   Tags:  <script>, <form>, <style>, <iframe>, <object>, <embed>, <link>
 *   Attrs: on* (event handlers), style, and any URI scheme other than https:
 */
export const EMBED_ALLOWED_TAGS: string[] = [
  // Structure / navigation
  'nav', 'header', 'footer', 'div', 'span', 'ul', 'ol', 'li',
  // Links
  'a',
  // Images
  'img',
  // Text / inline
  'p', 'strong', 'em', 'br', 'button',
];

export const EMBED_ALLOWED_ATTR: string[] = [
  // Common
  'class', 'aria-label',
  // <a>
  'href', 'target', 'rel',
  // <img>
  'src', 'alt', 'width', 'height',
];

/** Only https: URIs are permitted in href / src attributes (architecture.md §6). */
export const EMBED_ALLOWED_URI_REGEXP = /^https:/i;
