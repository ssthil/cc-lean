---
name: lean
description: Audit this session's token/context consumption and switch into lean working mode — find the biggest consumers and apply the highest-impact reductions. Use when the user wants to cut token usage, asks "why is my context so full / what's eating tokens", or wants to work at top-tier efficiency.
---

You make the user's token/context consumption elite-tier: diagnose what's consuming the window, apply the highest-impact fix, and then *work lean* for the rest of the session. Be concrete and prioritise by impact — don't list every tip.

## Step 1 — Diagnose (biggest consumers first)
Get the breakdown: ask the user to run `/context` and paste it (or `/usage` for totals), or read the statusline %. Identify the top 2–3 consumers. The usual suspects, with the structural ones first:

- **MCP tools** — Claude Code *defers* tool schemas (only tools you actually use load into context), but the deferred pool is still large and loads piecemeal on first use. Every connected server adds tool names + server instructions up front, and using one tool can pull in thousands of tokens of schema. Connected-but-unused connectors are pure liability. Run `/mcp` to list servers; run `cc-lean audit` to find never-used ones.
- **CLAUDE.md / memory** — loaded every session start. Keep CLAUDE.md < 200 lines; move detail into skills (on-demand).
- **Messages (the transcript)** — conversation + every tool call/result (file reads, command output, large MCP JSON responses, screenshots). Grows with session length and number of tasks.
- **File reads** — re-reading the same files, or reading whole large files.

## Step 2 — Apply the highest-impact fix (in this order)
1. **Disconnect unused MCP connectors** — the biggest *permanent* win. List servers (`/mcp`); disconnect any not used for the current line of work. Shrinks the deferred pool and removes accidental-load risk every future session. (`cc-lean audit` finds the never-used ones from your history.)
2. **`/clear` at task boundaries** — when the transcript is the bulk and a task is done, clear. State should already live in memory/git/the tracker. `/compact` if mid-task and you must keep going.
3. **Right-size effort & model** — `/effort low` for simple/mechanical tasks; cheaper model via `/model` for routine work.
4. **Shrink always-loaded context** — trim CLAUDE.md, prune stale memory entries.

## Step 3 — Then work lean for the rest of the session (default behaviours)
- **Delegate broad/multi-file searches to subagents** (Explore/fork) — they read in their own context and return only the conclusion, keeping the main transcript small. Top behavioural lever after MCP.
- **Read narrowly** — use offset/limit on large files; reference earlier reads instead of re-reading; don't re-read a file you just edited.
- **Batch independent tool calls** in one turn; avoid redundant verification reads.
- **Keep outputs tight** — filter large command/log output (grep/head) before it enters context; don't echo whole files back.
- **One task per session**, then clear. Lean, scannable responses over walls of text.

## Output
A short report: **top 3 consumers** (with numbers) → **top 3 actions** ranked by impact → then proceed in lean mode. Re-run on demand to re-measure. Pairs with the statusline advisor (live context meter) and `/context` / `/usage`.
