/**
 * SillyTavern-compatible regex script engine.
 *
 * Supports the subset of SillyTavern's regex extension features needed for
 * history cleanup before prompts are sent to the AI. Display-side transforms
 * (markdownOnly && !promptOnly) are NOT executed here yet — those depend on
 * the UI doing HTML rendering, which this app currently doesn't.
 */

import type { RegexScript } from './types';

/** Parse a SillyTavern findRegex value into a RegExp.
 *  Accepts both bare patterns and `/pattern/flags` wrapped form. */
export function parseFindRegex(raw: string): RegExp | null {
  if (!raw) return null;
  const wrapped = raw.match(/^\/(.+)\/([a-z]*)$/is);
  try {
    if (wrapped) {
      const [, pattern, flags] = wrapped;
      // Ensure global so replace hits all matches; preserve other flags.
      const finalFlags = flags.includes('g') ? flags : flags + 'g';
      return new RegExp(pattern, finalFlags);
    }
    return new RegExp(raw, 'g');
  } catch (e) {
    console.warn('[regex-engine] invalid pattern:', raw, e);
    return null;
  }
}

function applyTrimStrings(text: string, trims: string[]): string {
  if (!trims || trims.length === 0) return text;
  let out = text;
  for (const t of trims) {
    if (!t) continue;
    out = out.split(t).join('');
  }
  return out;
}

/** Apply ONE rule to a single text. Returns the transformed text. */
export function applyRule(text: string, rule: RegexScript): string {
  if (rule.disabled) return text;
  const re = parseFindRegex(rule.findRegex);
  if (!re) return text;
  const trimmed = applyTrimStrings(text, rule.trimStrings ?? []);
  try {
    return trimmed.replace(re, rule.replaceString ?? '');
  } catch (e) {
    console.warn('[regex-engine] replace failed for', rule.scriptName, e);
    return trimmed;
  }
}

export interface ApplyContext {
  /** 1 = user input, 2 = AI output (matches SillyTavern's placement codes). */
  role: 1 | 2;
  /** Depth from the newest message; 0 = newest, larger = older. */
  depth: number;
}

/** Apply all enabled prompt-side rules to a single message text.
 *  Rules are filtered by:
 *    - not disabled
 *    - promptOnly === true
 *    - placement includes ctx.role
 *    - depth within [minDepth, maxDepth] (null bounds = unbounded) */
export function applyPromptRules(
  text: string,
  rules: RegexScript[],
  ctx: ApplyContext,
): string {
  let out = text;
  for (const rule of rules) {
    if (rule.disabled) continue;
    if (!rule.promptOnly) continue;
    if (!Array.isArray(rule.placement) || !rule.placement.includes(ctx.role)) continue;
    if (typeof rule.minDepth === 'number' && ctx.depth < rule.minDepth) continue;
    if (typeof rule.maxDepth === 'number' && ctx.depth > rule.maxDepth) continue;
    out = applyRule(out, rule);
  }
  return out;
}

/** Returns true if the given rule is a display-only rule (renders to HTML). */
export function isDisplayRule(rule: RegexScript): boolean {
  return !!rule.markdownOnly && !rule.promptOnly;
}

/** Apply all enabled display rules in order. Used by the UI when rendering the
 *  assistant maintext. Only rules with markdownOnly=true && !promptOnly run here,
 *  filtered by placement (always 2 for AI display) and depth bounds. */
export function applyDisplayRules(
  text: string,
  rules: RegexScript[],
  ctx: { depth: number },
): string {
  let out = text;
  for (const rule of rules) {
    if (rule.disabled) continue;
    if (!isDisplayRule(rule)) continue;
    if (!Array.isArray(rule.placement) || !rule.placement.includes(2)) continue;
    if (typeof rule.minDepth === 'number' && ctx.depth < rule.minDepth) continue;
    if (typeof rule.maxDepth === 'number' && ctx.depth > rule.maxDepth) continue;
    out = applyRule(out, rule);
  }
  return out;
}

/** Returns true if the given rule is a prompt-history rule (handled here). */
export function isPromptRule(rule: RegexScript): boolean {
  return !!rule.promptOnly;
}
