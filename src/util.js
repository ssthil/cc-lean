// Shared helpers: paths, colour, formatting. Zero dependencies.
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

export const HOME = os.homedir();
export const CLAUDE_DIR = path.join(HOME, '.claude');
export const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');
export const SETTINGS_PATH = path.join(CLAUDE_DIR, 'settings.json');
export const GLOBAL_CLAUDE_MD = path.join(CLAUDE_DIR, 'CLAUDE.md');

// CLAUDE.md guideline: keep it lean so it doesn't bloat every session start.
export const CLAUDE_MD_MAX_LINES = 200;

// Colour when attached to a TTY, or when FORCE_COLOR is set (so piped captures —
// e.g. rendering the audit to a screenshot — keep their ANSI). NO_COLOR wins.
const useColor = (Boolean(process.env.FORCE_COLOR) || process.stdout.isTTY) && !process.env.NO_COLOR;
const wrap = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
export const c = {
  red: wrap('31'),
  yellow: wrap('33'),
  green: wrap('32'),
  cyan: wrap('36'),
  dim: wrap('2'),
  bold: wrap('1'),
};

// Visible-width helpers — measure/pad strings ignoring ANSI colour codes, so
// box-drawn layouts stay aligned regardless of styling.
const ANSI_RE = /\x1b\[[0-9;]*m/g;
export const vlen = (s) => String(s).replace(ANSI_RE, '').length;
export const padEnd = (s, n) => s + ' '.repeat(Math.max(0, n - vlen(s)));
export const padStart = (s, n) => ' '.repeat(Math.max(0, n - vlen(s))) + s;

/** Word-wrap plain text to a max visible width. */
export function wrapText(text, width) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if (line && vlen(line) + 1 + vlen(w) > width) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Read + parse a JSON file, returning `fallback` on any failure. */
export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

/** Recursively list files matching a predicate, swallowing permission errors. */
export function walk(dir, test, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, test, out);
    else if (test(full)) out.push(full);
  }
  return out;
}

/** Friendly relative-time string from an ISO timestamp. */
export function ago(iso) {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
