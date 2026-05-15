/**
 * Safe HTML rendering for regex display-rule output.
 *
 * SillyTavern regex display rules transform text into rich HTML (often with
 * inline <style> blocks for visual flair). We need to render that HTML in the
 * assistant bubble, but the threat surface is non-trivial — even though the
 * regex source is user-controlled, a malformed `replaceString` could embed
 * a <script> tag or javascript: URI. DOMPurify scrubs that.
 *
 * We allow <style> because SillyTavern display rules embed scoped CSS; we
 * forbid <script>, on* event attrs, and javascript:/data: URIs by default.
 */

import DOMPurify, { type Config } from 'dompurify';

const PURIFY_CONFIG: Config = {
  // Permit common rich-text + scoped style; ban scripting & form widgets.
  ADD_TAGS: ['style'],
  ADD_ATTR: ['style', 'class', 'data-*'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'meta', 'link'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, PURIFY_CONFIG) as unknown as string;
}
