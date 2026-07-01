---
description: Finish the cc-lean lean setup — install the live context/cost statusline (which a plugin can't set on its own).
---

The `cc-lean` plugin ships the `/lean` skill and a PreCompact nudge, but Claude Code does **not** let a plugin configure your `statusLine` — that's a user setting. To get the live context-%/cost gauge, do one of the following:

**Option A — one command (recommended):**

```bash
npx @ssthil/cc-lean init
```

This writes `~/.claude/statusline-advisor.sh`, adds the `statusLine` entry to `~/.claude/settings.json` (backing up anything it replaces), and installs the `/lean` skill. Requires [`jq`](https://jqlang.github.io/jq/). Restart Claude Code afterwards.

**Option B — manual:** add this to `~/.claude/settings.json`:

```json
{
  "statusLine": { "type": "command", "command": "~/.claude/statusline-advisor.sh", "padding": 0 }
}
```

Then grab the script from https://github.com/ssthil/cc-lean (`assets/statusline-advisor.sh`), make it executable, and restart Claude Code.

Once set up, watch the gauge turn yellow at 70% and red at 90%, and run `/lean` whenever it climbs.
