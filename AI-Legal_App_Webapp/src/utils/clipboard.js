/**
 * clipboard.js
 *
 * Cross-origin / cross-protocol safe clipboard helpers.
 *
 * navigator.clipboard is only available in secure contexts (HTTPS / localhost).
 * On plain HTTP (e.g. http://beta.aisa24.com) it is undefined, so we fall back
 * to the legacy document.execCommand('copy') approach which works everywhere.
 */

/**
 * Copy plain text to the clipboard.
 * @param {string} text - The text to copy.
 * @returns {Promise<void>}
 */
export async function copyText(text) {
  // Modern API — only available over HTTPS / localhost
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }

  // Legacy fallback — works on HTTP too
  const el = document.createElement('textarea');
  el.value = text;
  // Prevent scrolling to bottom on iOS
  el.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
  document.body.appendChild(el);
  el.focus();
  el.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(el);
  if (!ok) throw new Error('execCommand copy failed');
}

/**
 * Check whether the Clipboard API (including write() for images) is available.
 * @returns {boolean}
 */
export function isClipboardAPIAvailable() {
  return !!(navigator.clipboard && window.isSecureContext);
}
