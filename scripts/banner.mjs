// Dev-only: render a README hero banner (docs/banner.png) with headless Chrome.
// Matches the Catppuccin Mocha theme of the audit output. Not shipped to npm.
// Run: node scripts/banner.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'banner.png');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const W = 1200;
const H = 300;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; }
  body {
    display: flex; flex-direction: column; justify-content: center;
    padding: 0 64px;
    background:
      radial-gradient(900px 300px at 85% -20%, #cba6f733, transparent 60%),
      radial-gradient(700px 300px at 10% 120%, #94e2d522, transparent 60%),
      linear-gradient(135deg, #1e1e2e 0%, #181825 100%);
    color: #cdd6f4;
    font-family: "SF Mono", Menlo, Consolas, monospace;
  }
  .wordmark {
    font-size: 84px; font-weight: 700; letter-spacing: -2px; line-height: 1;
    background: linear-gradient(100deg, #cba6f7 0%, #b4befe 45%, #94e2d5 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .tagline { margin-top: 16px; font-size: 26px; color: #cdd6f4; font-weight: 500; }
  .sub { margin-top: 6px; font-size: 17px; color: #9399b2; }
  .prompt {
    margin-top: 26px; display: inline-block; align-self: flex-start;
    padding: 9px 16px; border-radius: 8px;
    background: #11111b; border: 1px solid #313244;
    font-size: 16px; color: #a6adc8;
  }
  .prompt b { color: #a6e3a1; font-weight: 700; }
  .dots { position: absolute; top: 26px; right: 40px; display: flex; gap: 9px; }
  .dot { width: 13px; height: 13px; border-radius: 50%; }
</style></head><body>
  <div class="dots">
    <span class="dot" style="background:#f38ba8"></span>
    <span class="dot" style="background:#f9e2af"></span>
    <span class="dot" style="background:#a6e3a1"></span>
  </div>
  <div class="wordmark">cc-lean</div>
  <div class="tagline">Keep your Claude Code setup lean.</div>
  <div class="sub">Static, offline audit of ~/.claude — never-used MCP connectors, oversized CLAUDE.md, missing guardrails.</div>
  <div class="prompt"><b>$</b> npx @ssthil/cc-lean audit</div>
</body></html>`;

const htmlPath = path.join(os.tmpdir(), 'cc-lean-banner.html');
fs.writeFileSync(htmlPath, html);
fs.mkdirSync(path.dirname(OUT), { recursive: true });

execFileSync(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=2',
  `--screenshot=${OUT}`,
  `--window-size=${W},${H}`,
  `file://${htmlPath}`,
], { stdio: 'ignore' });

console.log(`wrote ${OUT} (${W}x${H} @2x)`);
