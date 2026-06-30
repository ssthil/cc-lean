// `cc-lean init` — lay down the lean default setup, safely and idempotently.
//   1. statusline-advisor.sh  -> ~/.claude/
//   2. statusLine entry merged into ~/.claude/settings.json (backed up first)
//   3. /lean skill            -> ~/.claude/skills/lean/SKILL.md
// Never clobbers an existing file without backing it up; prints what it did.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { c, readJson, CLAUDE_DIR, SETTINGS_PATH } from './util.js';

const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');

function backup(file) {
  const bak = `${file}.bak`;
  try {
    fs.copyFileSync(file, bak);
    return bak;
  } catch {
    return null;
  }
}

function copyAsset(rel, dest, { mode } = {}) {
  const src = path.join(ASSETS, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const existed = fs.existsSync(dest);
  if (existed) backup(dest);
  fs.copyFileSync(src, dest);
  if (mode != null) fs.chmodSync(dest, mode);
  return existed;
}

export function init({ dryRun = false } = {}) {
  console.log(c.bold('\ncc-lean init') + c.dim('  ·  installing the lean default setup\n'));

  const statusScript = path.join(CLAUDE_DIR, 'statusline-advisor.sh');
  const skillFile = path.join(CLAUDE_DIR, 'skills', 'lean', 'SKILL.md');

  if (dryRun) {
    console.log(c.dim('  [dry run] would write:'));
    console.log(`    ${statusScript}`);
    console.log(`    ${skillFile}`);
    console.log(`    statusLine entry in ${SETTINGS_PATH}\n`);
    return;
  }

  // 1 + 3: copy assets.
  const s1 = copyAsset('statusline-advisor.sh', statusScript, { mode: 0o755 });
  console.log(`  ${c.green('✓')} statusline-advisor.sh ${c.dim(s1 ? '(updated, .bak saved)' : '(new)')}`);
  const s3 = copyAsset(path.join('skills', 'lean', 'SKILL.md'), skillFile);
  console.log(`  ${c.green('✓')} /lean skill ${c.dim(s3 ? '(updated, .bak saved)' : '(new)')}`);

  // 2: merge statusLine into settings.json without disturbing other keys.
  const settings = readJson(SETTINGS_PATH, {}) || {};
  if (settings.statusLine) {
    console.log(`  ${c.dim('·')} settings.json already has a statusLine — left untouched`);
  } else {
    if (fs.existsSync(SETTINGS_PATH)) backup(SETTINGS_PATH);
    settings.statusLine = { type: 'command', command: `${statusScript}`, padding: 0 };
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`);
    console.log(`  ${c.green('✓')} statusLine added to settings.json`);
  }

  console.log(
    c.dim('\n  Note: the statusline needs ') + c.bold('jq') + c.dim('. Restart Claude Code to see it.\n'),
  );
}
