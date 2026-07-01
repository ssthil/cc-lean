// Presentation layer for `cc-lean audit`. Takes the structured report from
// audit.js and renders a modern, framed terminal UI — zero dependencies, just
// ANSI + Unicode box-drawing. Kept separate from the audit logic so the same
// data can feed other surfaces (e.g. a screenshot capture).
import { c, vlen, padEnd, padStart, wrapText } from './util.js';

const W = 60; // inner text width of framed blocks

const line = (n = W + 2) => '─'.repeat(n);
const scoreLabel = (s) => (s >= 80 ? 'lean & clean' : s >= 50 ? 'needs work' : 'heavy');
const scoreColor = (s) => (s >= 80 ? c.green : s >= 50 ? c.yellow : c.red);

/** A rounded box with an optional inline title; `rows` are pre-styled strings. */
function box(title, rows) {
  const out = [];
  if (title) {
    const head = `─ ${title} `;
    out.push(c.dim('╭') + c.dim(head) + c.dim(line(W + 2 - vlen(head))) + c.dim('╮'));
  } else {
    out.push(c.dim(`╭${line()}╮`));
  }
  for (const r of rows) out.push(`${c.dim('│')} ${padEnd(r, W)} ${c.dim('│')}`);
  out.push(c.dim(`╰${line()}╯`));
  return out;
}

/** Horizontal meter: filled/empty cells over `width`, coloured by `color`. */
function meter(pct, width, color) {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return color('█'.repeat(filled)) + c.dim('░'.repeat(width - filled));
}

/** Tiny proportional bar for connector usage counts. */
function spark(count, max, width = 6) {
  const cells = max > 0 ? Math.max(1, Math.round((count / max) * width)) : 0;
  return c.cyan('▇'.repeat(cells)) + c.dim('·'.repeat(width - cells));
}

export function renderReport(d) {
  const L = [];
  const push = (...xs) => L.push(...xs);

  // Header banner.
  push('');
  push(...box(null, [
    `${c.bold('cc-lean')}  ${c.dim('·')}  ${c.cyan('audit')}`,
    c.dim('static · offline · read-only posture report'),
  ]));
  push('');

  // Score gauge.
  const sc = scoreColor(d.score);
  push(`  ${c.bold('POSTURE')}   ${sc(`${d.score}`)}${c.dim('/100')}   ${sc(scoreLabel(d.score))}`);
  push(`  ${meter(d.score, 30, sc)}`);
  push('');

  // Connectors.
  const { active, unused } = d.connectors;
  push(`  ${c.bold('MCP CONNECTORS')}${padStart(c.dim(`${d.files} transcripts`), W - 14)}`);
  push(`  ${c.dim(line(W))}`);
  if (active.length === 0 && unused.length === 0) {
    push(`  ${c.dim('none found in your history')}`);
  } else {
    const max = Math.max(1, ...active.map((a) => a.count));
    for (const a of active) {
      const name = padEnd(c.green('●') + ' ' + a.name, 22);
      const bar = padEnd(spark(a.count, max), 8);
      const stat = padEnd(c.dim(`${a.count}×`), 6);
      push(`  ${name} ${bar} ${stat} ${c.dim(a.last)}`);
    }
    for (const u of unused) {
      const name = padEnd(c.red('○') + ' ' + c.dim(u.name), 22);
      push(`  ${name} ${c.red('never used')}  ${c.dim(`~${u.tools} tools deferred`)}`);
    }
  }
  push('');

  // CLAUDE.md + guardrails.
  push(`  ${c.bold('CLAUDE.md')}`);
  for (const m of d.claudeMd) {
    const ok = !m.over;
    push(`    ${ok ? c.green('●') : c.yellow('▲')} ${padEnd(m.scope, 8)} ${
      ok ? c.dim(`${m.lines} lines`) : c.yellow(`${m.lines} lines — over 200`)
    }`);
  }
  if (d.claudeMd.length === 0) push(`    ${c.dim('none found')}`);
  push('');
  push(`  ${c.bold('GUARDRAILS')}`);
  push(`    ${d.statusline ? c.green('●') : c.yellow('▲')} statusline ${
    d.statusline ? c.dim('configured') : c.yellow('not configured')
  }`);
  push(`    ${c.dim('·')} ${c.dim(`memory: ${d.memory.files} files, ~${d.memory.kb} KB`)}`);
  push('');

  // Top fixes.
  if (d.fixes.length === 0) {
    push(...box('ALL CLEAR', [c.green('Lean and clean — nothing to fix. 🌱')]));
  } else {
    const marks = ['①', '②', '③'];
    const rows = [];
    d.fixes.slice(0, 3).forEach((f, i) => {
      const wrapped = wrapText(f.text, W - 2);
      wrapped.forEach((w, j) => {
        rows.push(j === 0 ? `${c.cyan(marks[i])} ${w}` : `  ${c.dim(w)}`);
      });
    });
    push(...box(c.bold('TOP FIXES'), rows));
  }
  push('');

  console.log(L.join('\n'));
}
