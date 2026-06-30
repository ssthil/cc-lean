# cc-lean

**Keep your Claude Code setup lean.** A static, offline audit of your `~/.claude` config that finds the things quietly bloating every session — then lays down a sensible lean default setup.

No telemetry, no servers launched, no network calls. It only reads files already on your disk.

```bash
npx cc-lean audit      # posture report
npx cc-lean init       # install the lean default setup
```

## Why

Claude Code *defers* MCP tool schemas — a connected server's tools don't enter context until you actually use one. That's good, but the deferred pool is real: a typical multi-connector setup carries **70k+ tokens** of schemas waiting to load piecemeal, plus tool names and server instructions paid up front. Connected-but-never-used connectors are pure liability.

`cc-lean` answers the question no other tool does **statically and offline**: *which of my connectors have I never actually used?* — by reading your own session history, not by launching servers or guessing.

> **Honest scope:** Claude Code only feeds live usage to the *statusline*, so real-time monitoring from an external process is impossible. `cc-lean` is deliberately **setup + static audit**, not a live monitor. For live usage use the built-in `/context` and `/usage`; for cost reporting use [`ccusage`](https://github.com/ryoppippi/ccusage).

## `cc-lean audit`

Reads `~/.claude/projects/**/*.jsonl` and reports:

- **MCP connectors** — which servers you actually *use* (with call counts + last-used), and which are **connected but never used**, derived from real `tool_use` history.
- **CLAUDE.md size** — global + project, flagged when over 200 lines (it loads every session start).
- **Guardrails** — whether the statusline advisor is configured; memory footprint.
- **Posture score** (0–100) + the top 3 highest-impact fixes.

```
MCP connectors  (from 151 transcripts)
  ● Atlassian                27× · last today
  ● Figma                    5× · last 19d ago
  ○ Gmail                    never used · ~14 tools deferred
  ○ Slack                    never used · ~2 tools deferred
  ...
Posture score: 60/100
  1. Disconnect 17 never-used connectors (…) — shrinks the deferred MCP pool. Run /mcp.
```

## `cc-lean init`

Lays down the lean default setup, safely (existing files are backed up to `*.bak`, never silently clobbered):

1. `~/.claude/statusline-advisor.sh` — live context-%/cost gauge (green/yellow at 70%/red at 90%). Requires [`jq`](https://jqlang.github.io/jq/).
2. A `statusLine` entry merged into `~/.claude/settings.json` (other keys untouched).
3. The `/lean` skill at `~/.claude/skills/lean/SKILL.md` — on-demand consumption audit + lean working mode.

```bash
cc-lean init --dry-run   # preview without writing
```

## Requirements

- Node ≥ 18 (zero runtime dependencies)
- `jq` for the statusline (audit/init themselves don't need it)

## License

MIT
