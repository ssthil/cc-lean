// `cc-lean audit` — static, read-only posture report for a Claude Code setup.
// This module gathers the facts and computes the score; src/render.js draws it.
import fs from 'node:fs';
import {
  ago, readJson, walk,
  SETTINGS_PATH, GLOBAL_CLAUDE_MD, CLAUDE_DIR, CLAUDE_MD_MAX_LINES,
} from './util.js';
import { scanTranscripts } from './scan.js';
import { renderReport } from './render.js';

// Servers that are infrastructure, not user-facing connectors — never flag these.
const INFRA = new Set(['ccd', 'ccd_directory', 'ccd_session_mgmt']);

// Tokens that look like "mcp__x__y" but are prose/doc artifacts, not real servers
// (e.g. the literal example "mcp__server__tool" written in transcripts).
const NOISE = new Set(['server', 'mcp', 'scheduled', 'claude_ai', 'tool', 'name', 'example']);

// A real connector was actually used, or exposes at least two non-placeholder tools.
const isRealServer = (s, used, seen) => {
  if (INFRA.has(s) || NOISE.has(s)) return false;
  if (used.has(s)) return true;
  const real = [...(seen.get(s) || [])].filter((t) => t && t !== '?');
  return real.length >= 2;
};

// claude.ai connectors are namespaced "claude_ai_<Name>" — show the short name.
const pretty = (s) => s.replace(/^claude_ai_/, '');

function lineCount(file) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').length;
  } catch {
    return null;
  }
}

function checkClaudeMd() {
  const out = [];
  const global = lineCount(GLOBAL_CLAUDE_MD);
  if (global != null) out.push({ scope: 'global', lines: global, over: global > CLAUDE_MD_MAX_LINES });
  const proj = lineCount(`${process.cwd()}/CLAUDE.md`);
  if (proj != null) out.push({ scope: 'project', lines: proj, over: proj > CLAUDE_MD_MAX_LINES });
  return out;
}

function checkMemory() {
  const files = walk(`${CLAUDE_DIR}/projects`, (f) => f.endsWith('/MEMORY.md') || f.includes('/memory/'));
  let bytes = 0;
  for (const f of files) {
    try {
      bytes += fs.statSync(f).size;
    } catch {
      /* ignore */
    }
  }
  return { files: files.length, kb: Math.round(bytes / 1024) };
}

export async function audit() {
  const { seen, used, files } = await scanTranscripts();

  const servers = [...seen.keys()].filter((s) => isRealServer(s, used, seen));
  const active = servers
    .filter((s) => used.has(s))
    .sort((a, b) => used.get(b).count - used.get(a).count)
    .map((s) => ({ name: pretty(s), count: used.get(s).count, last: ago(used.get(s).last) }));
  const unused = servers
    .filter((s) => !used.has(s))
    .sort()
    .map((s) => ({ name: pretty(s), tools: seen.get(s)?.size ?? 0 }));

  const claudeMd = checkClaudeMd();
  const settings = readJson(SETTINGS_PATH, {}) || {};
  const statusline = Boolean(settings.statusLine);
  const memory = checkMemory();

  // Score + ranked fixes.
  const fixes = [];
  let score = 100;
  if (unused.length) {
    score -= Math.min(40, unused.length * 4);
    fixes.push({
      impact: unused.length * 4,
      text: `Disconnect ${unused.length} never-used connector${unused.length > 1 ? 's' : ''} (${unused
        .slice(0, 4)
        .map((u) => u.name)
        .join(', ')}${unused.length > 4 ? '…' : ''}) — shrinks the deferred MCP pool. Run /mcp.`,
    });
  }
  for (const m of claudeMd.filter((x) => x.over)) {
    score -= 15;
    fixes.push({ impact: 15, text: `Trim ${m.scope} CLAUDE.md (${m.lines} lines) under ${CLAUDE_MD_MAX_LINES} — move detail into skills.` });
  }
  if (!statusline) {
    score -= 15;
    fixes.push({ impact: 15, text: 'Add the statusline advisor for a live context %/cost gauge — run `cc-lean init`.' });
  }
  score = Math.max(0, score);
  fixes.sort((a, b) => b.impact - a.impact);

  renderReport({ files, connectors: { active, unused }, claudeMd, statusline, memory, score, fixes });
}
