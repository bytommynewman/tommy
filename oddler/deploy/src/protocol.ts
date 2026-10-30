/**
 * The client→server wire boundary. Every frame arrives from a browser we do not
 * control, so `parseClientMessage` is the one place that turns an untrusted
 * frame into a value the room may act on.
 */
const MAX_FRAME_BYTES = 16 * 1024;
const MAX_ACTION_BYTES = 4 * 1024;

export type ClientMessage =
  | { type: "join" }
  | { type: "action"; action: unknown }
  | { type: "reset" };

export type ParseResult =
  | { ok: true; msg: ClientMessage }
  | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseClientMessage(raw: string | ArrayBuffer): ParseResult {
  if (typeof raw !== "string") return { ok: false, error: "expected a text frame" };
  if (new TextEncoder().encode(raw).byteLength > MAX_FRAME_BYTES) {
    return { ok: false, error: "message too large" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "invalid json" };
  }
  if (!isRecord(parsed)) return { ok: false, error: "expected a json object" };
  switch (parsed.type) {
    case "join":
      // Identity is not taken from the frame: the Worker resolves the player
      // from the token on the socket and the room reads it off the socket.
      // Older clients still send a `playerId`; it is ignored.
      return { ok: true, msg: { type: "join" } };
    case "action": {
      if (!("action" in parsed)) return { ok: false, error: "action required" };
      let size: number;
      try {
        size = new TextEncoder().encode(JSON.stringify(parsed.action) ?? "").byteLength;
      } catch {
        return { ok: false, error: "action is not serializable" };
      }
      if (size > MAX_ACTION_BYTES) return { ok: false, error: "action too large" };
      return { ok: true, msg: { type: "action", action: parsed.action } };
    }
    case "reset":
      return { ok: true, msg: { type: "reset" } };
    default:
      return { ok: false, error: `unknown message type: ${String(parsed.type)}` };
  }
}
