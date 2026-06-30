// Transcript scanning: derive which MCP servers are connected vs actually used,
// straight from ~/.claude/projects/**/*.jsonl. This is the heart of cc-lean —
// claude.ai connectors live server-side (not in ~/.claude.json), so usage is the
// only honest, fully-offline signal of what you actually rely on.
import fs from 'node:fs';
import readline from 'node:readline';
import { PROJECTS_DIR, walk } from './util.js';

// Matches a whole MCP tool token: mcp__<server>__<tool>. Server names contain
// single underscores (e.g. claude_ai_Atlassian) and the segments are split on the
// "__" delimiter — so grab the full word-run, then split, rather than sub-matching.
const MCP_RE = /mcp__[A-Za-z0-9_]+/g;

/**
 * @returns {Promise<{
 *   seen: Map<string, Set<string>>,      // server -> set of tool names ever present
 *   used: Map<string, {count:number,last:string|null}>,  // server -> actual tool_use stats
 *   files: number
 * }>}
 */
export async function scanTranscripts() {
  const files = walk(PROJECTS_DIR, (f) => f.endsWith('.jsonl'));
  const seen = new Map();
  const used = new Map();

  const addSeen = (server, tool) => {
    if (!seen.has(server)) seen.set(server, new Set());
    seen.get(server).add(tool);
  };
  const addUsed = (server, ts) => {
    const cur = used.get(server) || { count: 0, last: null };
    cur.count += 1;
    if (ts && (!cur.last || ts > cur.last)) cur.last = ts;
    used.set(server, cur);
  };

  for (const file of files) {
    const rl = readline.createInterface({
      input: fs.createReadStream(file, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });
    for await (const line of rl) {
      if (!line.includes('mcp__')) continue;

      // Availability: any mcp__server__tool token anywhere (incl. deferred listings).
      for (const m of line.matchAll(MCP_RE)) {
        const parts = m[0].split('__'); // ['mcp', '<server>', '<tool>?']
        if (parts.length >= 2 && parts[1]) addSeen(parts[1], parts.slice(2).join('__') || '?');
      }

      // Actual usage: only parse lines that carry a tool_use block.
      if (!line.includes('"tool_use"')) continue;
      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      const content = obj?.message?.content;
      if (!Array.isArray(content)) continue;
      for (const b of content) {
        if (b?.type === 'tool_use' && typeof b.name === 'string' && b.name.startsWith('mcp__')) {
          const server = b.name.split('__')[1];
          if (server) addUsed(server, obj.timestamp);
        }
      }
    }
  }

  return { seen, used, files: files.length };
}
