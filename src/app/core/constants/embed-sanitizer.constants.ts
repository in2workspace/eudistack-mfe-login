/**
 * DOMPurify allow-list for tenant-provided embed code (header + footer).
 * Canonical source: architecture.md §6 (allow-list de sanitización).
 * Shared by EUDISTACK-605 (header) and EUDISTACK-606 (footer) — do not duplicate.
 *
 * Prohibited (implicit — not in these lists):
 *   Tags:  <script>, <form>, <style>, <iframe>, <object>, <embed>, <link>,
 *          <use>, <image> (SVG external ref), <foreignObject> (HTML injection),
 *          <animate>, <animateMotion>, <set> (UI redress / timing attacks)
 *   Attrs: on* (event handlers), and any URI scheme other than https:
 *         Note: style attribute IS allowed — DOMPurify sanitizes CSS values inline.
 *         The <style> tag (stylesheet injection) remains prohibited.
 */
export const EMBED_ALLOWED_TAGS: string[] = [
  // HTML — structure / navigation
  'nav', 'header', 'footer', 'div', 'span', 'ul', 'ol', 'li',
  // HTML — links / media
  'a', 'img',
  // HTML — text / inline
  'p', 'strong', 'em', 'br', 'button',
  // SVG — root and grouping (no <use>/<image>: can reference external resources)
  'svg', 'g', 'defs',
  // SVG — shapes
  'path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line',
  // SVG — text (no external resource risk)
  'text', 'tspan',
  // SVG — masking / clipping / gradients (all purely internal)
  'clippath', 'mask', 'lineargradient', 'radialgradient', 'stop',
];

export const EMBED_ALLOWED_ATTR: string[] = [
  // HTML common
  'class', 'aria-label', 'style',
  // <a>
  'href', 'target', 'rel',
  // <img> / SVG root shared
  'src', 'alt', 'width', 'height',
  // SVG root
  'viewbox', 'xmlns',
  // SVG geometry — path data and shape coordinates
  'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'points',
  // SVG paint
  'fill', 'fill-opacity', 'fill-rule',
  'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-dasharray', 'stroke-dashoffset',
  // SVG compositing and transforms
  'opacity', 'transform', 'clip-path', 'clip-rule',
  // SVG internal reference (for clipPath / defs / mask — safe, internal-only)
  'id',
  // SVG gradients
  'gradientunits', 'gradienttransform', 'spreadmethod',
  'offset', 'stop-color', 'stop-opacity',
];

/**
 * https: URIs, same-origin /assets/ paths, and {template} placeholders are
 * permitted in href / src attributes. Placeholders are resolved after
 * sanitization so DOMPurify never sees the runtime asset path.
 */
export const EMBED_ALLOWED_URI_REGEXP = /^(https:|\/assets\/|\{)/i;
