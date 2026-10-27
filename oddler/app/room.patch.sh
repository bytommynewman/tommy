#!/usr/bin/env bash
# Stamp every action with the room's clock before the rules see it.
# logic.js stays pure (time is an input), and the client cannot forge `at`.
set -euo pipefail
F="$1"
python3 - "$F" <<'PY'
import sys, re
p = sys.argv[1]
s = open(p).read()
old = """      const verdict = logic.validateAction(game.state, playerId, msg.action);
      if (!verdict.ok) return this.error(connId, verdict.error ?? "invalid action");
      game.state = logic.applyAction(game.state, playerId, msg.action);"""
new = """      // Oddler: the room stamps the clock onto every action. Rules stay pure
      // (time is just an input) and a client cannot claim its own timestamp.
      const action =
        msg.action && typeof msg.action === "object" && !Array.isArray(msg.action)
          ? { ...(msg.action as Record<string, unknown>), at: Date.now() }
          : msg.action;
      const verdict = logic.validateAction(game.state, playerId, action);
      if (!verdict.ok) return this.error(connId, verdict.error ?? "invalid action");
      game.state = logic.applyAction(game.state, playerId, action);"""
assert old in s, "room.ts anchor not found"
s = s.replace(old, new)
open(p, "w").write(s)
print("room.ts patched")
PY
