// `cc-lean audit` — static, read-only posture report for a Claude Code setup.
import fs from 'node:fs';
import {
  c, ago, readJson, walk,
  SETTINGS_PATH, GLOBAL_CLAUDE_MD, CLAUDE_DIR, CLAUDE_MD_MAX_LINES,
} from './util.js';
import { scanTranscripts } from './scan.js';

// Servers that are infrastructure, not user-facing connectors — never flag these.
const INFRA = new Set(['ccd', 'ccd_directory', 'ccd_session_mgmt']);

// Tokens that look like "mcp__x__y" but are prose/doc artifacts, not real servers
// (e.g. the literal example "mcp__server__tool" written in transcripts).
const NOISE = new Set(['server', 'mcp', 'scheduled', 'claude_ai', 'tool', 'name', 'example']);

// A real connector was actually used, or exposes at least one non-placeholder tool.
const isRealServer = (s, used, seen) => {
  if (INFRA.has(s) || NOISE.has(s)) return false;
  if (used.has(s)) return true;
  // A never-used connector must expose >=2 real tools (genuine servers list at
  // least an auth pair); 1-tool tokens are prose placeholders like "mcp__x__y".
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
  if (global != null) out.push({ scope: 'global', path: GLOBAL_CLAUDE_MD, lines: global });
  const projectMd = `${process.cwd()}/CLAUDE.md`;
  const proj = lineCount(projectMd);
  if (proj != null) out.push({ scope: 'project', path: projectMd, lines: proj });
  return out;
}

function checkMemory() {
  const memDir = `${CLAUDE_DIR}/projects`;
  const files = walk(memDir, (f) => f.endsWith('/MEMORY.md') || f.includes('/memory/'));
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
  console.log(c.bold('\ncc-lean audit') + c.dim('  ·  static, offline posture report\n'));

  const { seen, used, files } = await scanTranscripts();

  // Connected-but-never-used connectors = the headline finding.
  const servers = [...seen.keys()].filter((s) => isRealServer(s, used, seen));
  const unused = servers.filter((s) => !used.has(s)).sort();
  const active = servers
    .filter((s) => used.has(s))
    .sort((a, b) => used.get(b).count - used.get(a).count);

  console.log(c.bold('MCP connectors') + c.dim(`  (from ${files} transcripts)`));
  if (servers.length === 0) {
    console.log(c.dim('  No MCP connectors seen in your history.\n'));
  } else {
    for (const s of active) {
      const u = used.get(s);
      console.log(`  ${c.green('●')} ${pretty(s).padEnd(24)} ${c.dim(`${u.count}× · last ${ago(u.last)}`)}`);
    }
    for (const s of unused) {
      const tools = seen.get(s)?.size ?? 0;
      console.log(`  ${c.red('○')} ${pretty(s).padEnd(24)} ${c.red('never used')} ${c.dim(`· ~${tools} tools deferred`)}`);
    }
    console.log('');
  }

  // CLAUDE.md size.
  const mds = checkClaudeMd();
  console.log(c.bold('CLAUDE.md'));
  for (const m of mds) {
    const over = m.lines > CLAUDE_MD_MAX_LINES;
    const tag = over ? c.yellow(`${m.lines} lines — over ${CLAUDE_MD_MAX_LINES}`) : c.green(`${m.lines} lines`);
    console.log(`  ${over ? c.yellow('!') : c.green('●')} ${m.scope.padEnd(8)} ${tag}`);
  }
  if (mds.length === 0) console.log(c.dim('  none found'));
  console.log('');

  // Statusline guardrail.
  const settings = readJson(SETTINGS_PATH, {}) || {};
  const hasStatusline = Boolean(settings.statusLine);
  console.log(c.bold('Guardrails'));
  console.log(
    `  ${hasStatusline ? c.green('●') : c.yellow('!')} statusline advisor ${
      hasStatusline ? c.green('configured') : c.yellow('not configured — no live context/cost gauge')
    }`,
  );
  const mem = checkMemory();
  console.log(`  ${c.dim('·')} memory: ${mem.files} files, ~${mem.kb} KB\n`);

  // Score + ranked fixes.
  const fixes = [];
  let score = 100;
  if (unused.length) {
    score -= Math.min(40, unused.length * 4);
    fixes.push({
      impact: unused.length * 4,
      text: `Disconnect ${unused.length} never-used connector${unused.length > 1 ? 's' : ''} (${unused
        .slice(0, 4)
        .map(pretty)
        .join(', ')}${unused.length > 4 ? '…' : ''}) — shrinks the deferred MCP pool. Run /mcp.`,
    });
  }
  for (const m of mds.filter((x) => x.lines > CLAUDE_MD_MAX_LINES)) {
    score -= 15;
    fixes.push({ impact: 15, text: `Trim ${m.scope} CLAUDE.md (${m.lines} lines) under ${CLAUDE_MD_MAX_LINES} — move detail into skills.` });
  }
  if (!hasStatusline) {
    score -= 15;
    fixes.push({ impact: 15, text: 'Add the statusline advisor for a live context %/cost gauge — run `cc-lean init`.' });
  }
  score = Math.max(0, score);

  const scoreColor = score >= 80 ? c.green : score >= 50 ? c.yellow : c.red;
  console.log(c.bold('Posture score: ') + scoreColor(`${score}/100`));
  if (fixes.length === 0) {
    console.log(c.green('  Lean and clean — nothing to fix. 🌱\n'));
  } else {
    console.log(c.dim('  Top fixes (highest impact first):'));
    fixes
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3)
      .forEach((f, i) => console.log(`  ${c.cyan(`${i + 1}.`)} ${f.text}`));
    console.log('');
  }
}
