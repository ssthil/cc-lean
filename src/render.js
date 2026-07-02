// Presentation layer for `cc-lean audit`. Takes the structured report from
// audit.js and renders a modern, framed terminal UI — zero dependencies, just
// ANSI + Unicode box-drawing. Kept separate from the audit logic so the same
// data can feed other surfaces (e.g. a screenshot capture).
import { c, vlen, padEnd, padStart, wrapText, gradient } from './util.js';

const W = 60; // inner text width of framed blocks

const line = (n = W + 2) => '─'.repeat(n);
const heading = (s) => c.lavender(c.bold(s));
const scoreLabel = (s) => (s >= 80 ? 'lean & clean' : s >= 50 ? 'needs work' : 'heavy');
const scoreColor = (s) => (s >= 80 ? c.green : s >= 50 ? c.yellow : c.red);

/** A rounded box with an optional inline title; `rows` are pre-styled strings. */
function box(title, rows) {
  const out = [];
  if (title) {
    const head = `─ ${title} `;
    out.push(c.overlay('╭') + c.overlay(head) + c.overlay(line(W + 2 - vlen(head))) + c.overlay('╮'));
  } else {
    out.push(c.overlay(`╭${line()}╮`));
  }
  for (const r of rows) out.push(`${c.overlay('│')} ${padEnd(r, W)} ${c.overlay('│')}`);
  out.push(c.overlay(`╰${line()}╯`));
  return out;
}

/** Horizontal meter: filled/empty cells over `width`, coloured by `color`. */
function meter(pct, width, color) {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return color('█'.repeat(filled)) + c.overlay('░'.repeat(width - filled));
}

/** Tiny proportional bar for connector usage counts. */
function spark(count, max, width = 6) {
  const cells = max > 0 ? Math.max(1, Math.round((count / max) * width)) : 0;
  return c.teal('▇'.repeat(cells)) + c.overlay('·'.repeat(width - cells));
}

/** Compact wordmark banner shown on the bare `cc-lean` / `-h` screen. */
export function renderWelcome() {
  const L = [];
  L.push('');
  L.push(`  ${c.red('●')} ${c.yellow('●')} ${c.green('●')}`);
  L.push('');
  L.push(`  ${gradient([...'cc-lean'].join(' '))}`);
  L.push(`  ${c.text('Keep your Claude Code setup lean.')}`);
  L.push(`  ${c.subtext('Static, offline audit of ~/.claude — no telemetry, no network calls.')}`);
  L.push('');
  L.push(`  ${c.mauve('[mcp audit]')} ${c.teal('[claude.md]')} ${c.yellow('[statusline]')}`);
  console.log(L.join('\n'));
}

export function renderReport(d) {
  const L = [];
  const push = (...xs) => L.push(...xs);

  // Header banner.
  push('');
  push(...box(null, [
    `${c.mauve(c.bold('cc-lean'))}  ${c.muted('·')}  ${c.sky('audit')}`,
    c.muted('static · offline · read-only posture report'),
  ]));
  push('');

  // Score gauge.
  const sc = scoreColor(d.score);
  push(`  ${heading('POSTURE')}   ${sc(c.bold(`${d.score}`))}${c.muted('/100')}   ${sc(scoreLabel(d.score))}`);
  push(`  ${meter(d.score, 30, sc)}`);
  push('');

  // Connectors.
  const { active, unused } = d.connectors;
  push(`  ${heading('MCP CONNECTORS')}${padStart(c.subtext(`${d.files} transcripts`), W - 14)}`);
  push(`  ${c.overlay(line(W))}`);
  if (active.length === 0 && unused.length === 0) {
    push(`  ${c.muted('none found in your history')}`);
  } else {
    const max = Math.max(1, ...active.map((a) => a.count));
    for (const a of active) {
      const name = padEnd(`${c.green('●')} ${c.text(a.name)}`, 22);
      const bar = padEnd(spark(a.count, max), 8);
      const stat = padEnd(c.subtext(`${a.count}×`), 6);
      push(`  ${name} ${bar} ${stat} ${c.subtext(a.last)}`);
    }
    for (const u of unused) {
      const name = padEnd(`${c.maroon('○')} ${c.muted(u.name)}`, 22);
      push(`  ${name} ${c.maroon('never used')}  ${c.muted(`~${u.tools} tools deferred`)}`);
    }
  }
  push('');

  // CLAUDE.md + guardrails.
  push(`  ${heading('CLAUDE.md')}`);
  for (const m of d.claudeMd) {
    const ok = !m.over;
    push(`    ${ok ? c.green('●') : c.peach('▲')} ${c.text(padEnd(m.scope, 8))} ${
      ok ? c.subtext(`${m.lines} lines`) : c.peach(`${m.lines} lines — over 200`)
    }`);
  }
  if (d.claudeMd.length === 0) push(`    ${c.muted('none found')}`);
  push('');
  push(`  ${heading('GUARDRAILS')}`);
  push(`    ${d.statusline ? c.green('●') : c.peach('▲')} ${c.text('statusline')} ${
    d.statusline ? c.subtext('configured') : c.peach('not configured')
  }`);
  push(`    ${c.muted('·')} ${c.muted(`memory: ${d.memory.files} files, ~${d.memory.kb} KB`)}`);
  push('');

  // Top fixes.
  if (d.fixes.length === 0) {
    push(...box(heading('ALL CLEAR'), [c.green('Lean and clean — nothing to fix. 🌱')]));
  } else {
    const marks = ['①', '②', '③'];
    const rows = [];
    d.fixes.slice(0, 3).forEach((f, i) => {
      const wrapped = wrapText(f.text, W - 2);
      wrapped.forEach((w, j) => {
        rows.push(j === 0 ? `${c.sky(marks[i])} ${c.text(w)}` : `  ${c.subtext(w)}`);
      });
    });
    push(...box(heading('TOP FIXES'), rows));
  }
  push('');

  console.log(L.join('\n'));
}
