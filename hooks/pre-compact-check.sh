#!/bin/bash
# cc-lean PreCompact nudge. Fires just before Claude Code compacts the context.
# Non-blocking: it only surfaces a reminder, never cancels compaction.
# Reads the hook event JSON on stdin (ignored) and emits a systemMessage.
cat >/dev/null 2>&1  # drain stdin

cat <<'JSON'
{"systemMessage":"cc-lean · compacting soon — confirm durable state lives in memory/git/your tracker. At a task boundary, prefer /clear (clean slate) over /compact. See /lean to trim what's eating the window."}
JSON
exit 0
