#!/usr/bin/env node
// cc-lean — static, offline audit + setup for a lean Claude Code.
import { parseArgs } from 'node:util';
import { audit } from './audit.js';
import { init } from './init.js';
import { c } from './util.js';

const HELP = `${c.bold('cc-lean')} — keep your Claude Code setup lean.

${c.bold('Usage')}
  cc-lean <command> [options]

${c.bold('Commands')}
  audit            Static, offline posture report: never-used MCP connectors,
                   oversized CLAUDE.md, missing guardrails → score + top fixes.
  init             Lay down the lean default setup (statusline advisor + /lean
                   skill + statusLine settings entry). Safe & idempotent.

${c.bold('Options')}
  --dry-run        (init) Show what would change without writing.
  -h, --help       Show this help.
  -v, --version    Show version.
`;

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
      'dry-run': { type: 'boolean' },
    },
  });

  if (values.version) {
    const { readJson } = await import('./util.js');
    const { fileURLToPath } = await import('node:url');
    const pkg = readJson(fileURLToPath(new URL('../package.json', import.meta.url)), {});
    console.log(pkg.version || 'unknown');
    return;
  }

  const cmd = positionals[0];
  if (values.help || !cmd) {
    console.log(HELP);
    return;
  }

  switch (cmd) {
    case 'audit':
      await audit();
      break;
    case 'init':
      init({ dryRun: Boolean(values['dry-run']) });
      break;
    default:
      console.error(c.red(`Unknown command: ${cmd}\n`));
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(c.red(`cc-lean: ${err.message}`));
  process.exitCode = 1;
});
