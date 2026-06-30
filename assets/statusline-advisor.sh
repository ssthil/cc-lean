#!/bin/bash
# Token/context consumption advisor for the Claude Code statusline.
# Reads the session JSON on stdin and renders: model · context-usage bar · cost,
# colouring the bar green/yellow/red and flagging "HEAVY" past the threshold.
# Installed by cc-lean (https://github.com/) — requires `jq`.
input=$(cat)

MODEL=$(echo "$input" | jq -r '.model.display_name // "?"')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
EXCEEDS=$(echo "$input" | jq -r '.exceeds_200k_tokens // false')
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
EFFORT=$(echo "$input" | jq -r '.effort.level // empty')

[ -z "$PCT" ] && PCT=0

RED='\033[31m'; YELLOW='\033[33m'; GREEN='\033[32m'; DIM='\033[2m'; RESET='\033[0m'

# Colour + warning by context usage (red also if the 200k hard threshold is hit)
if [ "$PCT" -ge 90 ] || [ "$EXCEEDS" = "true" ]; then
  COLOR="$RED"; WARN=" ⚠️  HEAVY — consider /clear or /compact"
elif [ "$PCT" -ge 70 ]; then
  COLOR="$YELLOW"; WARN=" ⚠️  getting full"
else
  COLOR="$GREEN"; WARN=""
fi

# 10-cell progress bar
FILLED=$((PCT / 10)); [ "$FILLED" -gt 10 ] && FILLED=10; EMPTY=$((10 - FILLED))
printf -v FILL "%${FILLED}s"; printf -v PAD "%${EMPTY}s"
BAR="${FILL// /█}${PAD// /░}"

COST_FMT=$(printf '$%.2f' "$COST")
EFFORT_FMT=""; [ -n "$EFFORT" ] && EFFORT_FMT="${DIM} · ${EFFORT}${RESET}"

echo -e "${DIM}${MODEL}${RESET}${EFFORT_FMT} ${COLOR}${BAR} ${PCT}%${RESET} ${DIM}ctx · ${COST_FMT}${RESET}${COLOR}${WARN}${RESET}"
