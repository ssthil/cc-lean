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
// Truecolor when the terminal advertises it (or colour is forced, e.g. for the
// screenshot capture); otherwise fall back to the basic 16-colour code so the
// output still looks reasonable on terminals without 24-bit support.
const truecolor = useColor && (Boolean(process.env.FORCE_COLOR) || /truecolor|24bit/.test(process.env.COLORTERM || ''));
const rgb = (hex, fallback) => {
  if (!truecolor) return fallback;
  const n = parseInt(hex.slice(1), 16);
  return `38;2;${(n >> 16) & 255};${(n >> 8) & 255};${n & 255}`;
};
const wrap = (code) => (s) => (useColor && code ? `\x1b[${code}m${s}\x1b[0m` : String(s));

// Palette — Catppuccin Mocha, each with a basic-16 fallback. `text` is left
// unstyled (empty code) so it renders as the terminal's default foreground.
export const c = {
  bold: wrap('1'),
  dim: wrap('2'),
  text: wrap(rgb('#cdd6f4', '')),
  subtext: wrap(rgb('#9399b2', '2')),
  muted: wrap(rgb('#6c7086', '2')),
  overlay: wrap(rgb('#585b70', '2')),
  mauve: wrap(rgb('#cba6f7', '35')),
  lavender: wrap(rgb('#b4befe', '36')),
  sky: wrap(rgb('#89dceb', '36')),
  teal: wrap(rgb('#94e2d5', '36')),
  green: wrap(rgb('#a6e3a1', '32')),
  yellow: wrap(rgb('#f9e2af', '33')),
  peach: wrap(rgb('#fab387', '33')),
  maroon: wrap(rgb('#eba0ac', '31')),
  red: wrap(rgb('#f38ba8', '31')),
  cyan: wrap(rgb('#89dceb', '36')),
};

/** Interpolate `text` across hex colour `stops` (truecolor only; falls back to bold mauve). */
export function gradient(text, stops = ['#cba6f7', '#b4befe', '#94e2d5']) {
  if (!useColor) return text;
  if (!truecolor) return c.mauve(c.bold(text));
  const rgbs = stops.map((hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  });
  const chars = [...text];
  const n = Math.max(1, chars.length - 1);
  return chars.map((ch, i) => {
    if (ch === ' ') return ch;
    const t = (i / n) * (rgbs.length - 1);
    const seg = Math.min(rgbs.length - 2, Math.floor(t));
    const lt = t - seg;
    const [r1, g1, b1] = rgbs[seg];
    const [r2, g2, b2] = rgbs[seg + 1];
    const lerp = (a, b) => Math.round(a + (b - a) * lt);
    return `\x1b[1m\x1b[38;2;${lerp(r1, r2)};${lerp(g1, g2)};${lerp(b1, b2)}m${ch}\x1b[0m`;
  }).join('');
}

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
