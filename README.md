<p align="center">
  <img src="https://raw.githubusercontent.com/ssthil/cc-lean/main/docs/banner.png" alt="cc-lean — keep your Claude Code setup lean" width="820">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ssthil/cc-lean"><img alt="npm version" src="https://img.shields.io/npm/v/@ssthil/cc-lean?logo=npm&label=npm&color=cba6f7"></a>
  <a href="https://github.com/ssthil/cc-lean/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/ssthil/cc-lean?logo=github&color=f9e2af"></a>
  <a href="https://github.com/ssthil/cc-lean/actions"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/ssthil/cc-lean/ci.yml?branch=main&logo=githubactions&logoColor=white&label=CI&color=94e2d5"></a>
  <img alt="license MIT" src="https://img.shields.io/badge/license-MIT-a6e3a1">
  <br>
  <img alt="Claude Code CLI + plugin" src="https://img.shields.io/badge/Claude%20Code-CLI%20%2B%20plugin-cba6f7">
  <img alt="tested on macOS" src="https://img.shields.io/badge/tested%20on-macOS-89b4fa?logo=apple&logoColor=white">
  <img alt="also works with Linux" src="https://img.shields.io/badge/also%20works%20with-Linux-a6e3a1?logo=linux&logoColor=white">
  <a href="https://github.com/ssthil/cc-lean/pulls"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-89dceb"></a>
</p>

**Keep your Claude Code setup lean.** A static, offline audit of your `~/.claude` config that finds the things quietly bloating every session — then lays down a lean default setup. No telemetry, no servers launched, no network calls — it only reads files already on your disk.

<p align="center">
  <img src="https://raw.githubusercontent.com/ssthil/cc-lean/main/docs/audit.png" alt="cc-lean audit — framed terminal report showing used vs never-used MCP connectors, a posture score, and top fixes" width="620">
</p>

```bash
npx @ssthil/cc-lean audit      # posture report
npx @ssthil/cc-lean init       # install the lean default setup
```

Or install globally — the command is `cc-lean` either way:

```bash
npm i -g @ssthil/cc-lean
cc-lean audit
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

See the screenshot above for the full framed report.

<details>
<summary>Plain-text sample (no colour)</summary>

```
POSTURE   60/100   needs work
██████████████████░░░░░░░░░░░░

MCP CONNECTORS                               152 transcripts
────────────────────────────────────────────────────────────
● Atlassian            ▇▇▇▇▇▇   28×    today
● Figma                ▇·····   5×     19d ago
○ Gmail                never used  ~14 tools deferred
○ Slack                never used  ~2 tools deferred
...

TOP FIXES
① Disconnect 16 never-used connectors (…) — shrinks the deferred MCP pool. Run /mcp.
```

</details>

## `cc-lean init`

Lays down the lean default setup, safely (existing files are backed up to `*.bak`, never silently clobbered):

1. `~/.claude/statusline-advisor.sh` — live context-%/cost gauge (green/yellow at 70%/red at 90%). Requires [`jq`](https://jqlang.github.io/jq/).
2. A `statusLine` entry merged into `~/.claude/settings.json` (other keys untouched).
3. The `/lean` skill at `~/.claude/skills/lean/SKILL.md` — on-demand consumption audit + lean working mode.

```bash
cc-lean init --dry-run   # preview without writing
```

## Install as a Claude Code plugin

Prefer to manage it inside Claude Code? This repo is also a plugin marketplace, so you can install the `/lean` skill and a **PreCompact nudge** (reminds you to preserve state and prefer `/clear` at task boundaries) directly:

```
/plugin marketplace add ssthil/cc-lean
/plugin install cc-lean@ssthil
```

The plugin ships the `/lean` skill and the PreCompact hook. It can't set your `statusLine` (that's a user-only setting), so run the bundled **`/lean-setup`** command — or `npx @ssthil/cc-lean init` — to add the live context/cost gauge.

## Requirements

- Node ≥ 18 (zero runtime dependencies)
- `jq` for the statusline (audit/init themselves don't need it)

## License

MIT
