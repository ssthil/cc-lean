// Dev-only: render `cc-lean audit` to a polished terminal-window PNG for the
// README. Captures the REAL forced-colour output, converts its ANSI to HTML, and
// screenshots it with headless Google Chrome (no extra install). Not shipped
// (excluded from package "files"); run with: node scripts/screenshot.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'audit.png');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// 1. Capture the real audit output with colour forced on.
const ansi = execFileSync('node', ['src/index.js', 'audit'], {
  cwd: ROOT,
  env: { ...process.env, FORCE_COLOR: '1' },
  encoding: 'utf8',
});

// 2. ANSI -> HTML. Output is captured with FORCE_COLOR=1, so colours arrive as
// truecolor SGR (38;2;r;g;b) plus bold(1)/dim(2)/reset(0).
function ansiToHtml(input) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let out = '';
  let bold = false;
  let dim = false;
  let color = null;
  const emit = (txt) => {
    if (!txt) return;
    const st = [];
    if (bold) st.push('font-weight:700');
    if (dim) st.push('opacity:.5');
    if (color) st.push(`color:${color}`);
    out += st.length ? `<span style="${st.join(';')}">${esc(txt)}</span>` : esc(txt);
  };
  const re = /\x1b\[([0-9;]*)m/g;
  let last = 0;
  let m;
  while ((m = re.exec(input))) {
    emit(input.slice(last, m.index));
    last = re.lastIndex;
    const codes = m[1].split(';').filter(Boolean).map(Number);
    if (codes.length === 0 || codes[0] === 0) {
      bold = false;
      dim = false;
      color = null;
    }
    for (let i = 0; i < codes.length; i += 1) {
      const cd = codes[i];
      if (cd === 1) bold = true;
      else if (cd === 2) dim = true;
      else if (cd === 38 && codes[i + 1] === 2) {
        color = `rgb(${codes[i + 2]},${codes[i + 3]},${codes[i + 4]})`;
        i += 4;
      }
    }
  }
  emit(input.slice(last));
  return out;
}

const bodyHtml = ansiToHtml(ansi.replace(/\n+$/, ''));
const lines = ansi.replace(/\n+$/, '').split('\n').length;

// 3. Terminal-window chrome.
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body { padding: 40px; background: radial-gradient(circle at 30% 0%, #2a2350, #11111b 70%); }
  .win { width: 660px; margin: 0 auto; border-radius: 12px; overflow: hidden;
         box-shadow: 0 24px 60px rgba(0,0,0,.55); border: 1px solid #ffffff14; }
  .bar { height: 40px; background: #181825; display: flex; align-items: center; gap: 8px; padding: 0 16px; }
  .dot { width: 12px; height: 12px; border-radius: 50%; }
  .title { color: #9399b2; font: 12px -apple-system, sans-serif; margin-left: 10px; }
  pre { margin: 0; padding: 20px 22px 24px; background: #1e1e2e; color: #cdd6f4;
        font: 14px/1.5 "SF Mono", Menlo, Consolas, monospace; }
</style></head><body>
  <div class="win">
    <div class="bar">
      <span class="dot" style="background:#ff5f56"></span>
      <span class="dot" style="background:#ffbd2e"></span>
      <span class="dot" style="background:#27c93f"></span>
      <span class="title">cc-lean audit — zsh</span>
    </div>
    <pre>${bodyHtml}</pre>
  </div>
</body></html>`;

const htmlPath = path.join(os.tmpdir(), 'cc-lean-audit.html');
fs.writeFileSync(htmlPath, html);
fs.mkdirSync(path.dirname(OUT), { recursive: true });

// 4. Screenshot with headless Chrome (2x for crispness).
const height = 80 + 40 + 44 + lines * 21;
execFileSync(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=2',
  `--screenshot=${OUT}`,
  `--window-size=740,${height}`,
  `file://${htmlPath}`,
], { stdio: 'ignore' });

console.log(`wrote ${OUT} (${lines} lines, window 740x${height})`);
