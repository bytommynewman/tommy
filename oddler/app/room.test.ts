/**
 * Room behaviour for Oddler, exercised through real WebSockets in workerd.
 *
 * The wire protocol (join / action / reset, state / error) is shared by every
 * game on the platform; the rules under test are Oddler's: one seat per room,
 * a run that starts on request, answers that are matched server-side with the
 * answer list hidden while the clock runs, and a late answer that scores zero.
 */

import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

/** Open a socket to a room and collect frames as they arrive. */
async function open(room = "main") {
  const res = await SELF.fetch(`https://game.test/ws/${room}`, {
    headers: { Upgrade: "websocket" },
  });
  expect(res.status).toBe(101);
  const ws = res.webSocket;
  if (!ws) throw new Error("no webSocket on the upgrade response");
  ws.accept();

  const frames: unknown[] = [];
  ws.addEventListener("message", (event: MessageEvent) => {
    const data = typeof event.data === "string" ? event.data : "";
    if (data === "__pong") return;
    try {
      frames.push(JSON.parse(data));
    } catch {
      frames.push(data);
    }
  });

  const next = async (pred: (f: any) => boolean, label: string) => {
    for (let i = 0; i < 100; i++) {
      const hit = frames.find(pred);
      if (hit) return hit as any;
      await scheduler.wait(10);
    }
    throw new Error(`timed out waiting for ${label}; got ${JSON.stringify(frames)}`);
  };

  return {
    ws,
    frames,
    next,
    send: (msg: unknown) => ws.send(JSON.stringify(msg)),
    state: () => next((f) => f?.type === "state", "a state frame"),
    error: () => next((f) => f?.type === "error", "an error frame"),
    /** The next state frame whose view is in `phase`. */
    phase: (phase: string) =>
      next((f) => f?.type === "state" && f.view?.phase === phase, `phase ${phase}`),
  };
}

let seq = 0;
function uniq(label: string): string {
  seq += 1;
  return `${label}-${seq}-${crypto.randomUUID().slice(0, 6)}`;
}

/** Join a fresh room as its one player and start a classic run. */
async function started(room: string, mode = "classic") {
  const p = await open(room);
  p.send({ type: "join", playerId: "tommy" });
  await p.phase("lobby");
  p.frames.length = 0;
  p.send({ type: "action", action: { kind: "start", mode, colour: "mint", seed: 7 } });
  const asked = await p.phase("ask");
  p.frames.length = 0;
  return { p, asked };
}

describe("routing", () => {
  it("rejects a non-upgrade request to /ws instead of waking a room", async () => {
    const res = await SELF.fetch("https://game.test/ws");
    expect(res.status).toBe(426);
  });

  it("404s a non-asset, non-ws path for a non-HTML request", async () => {
    const res = await SELF.fetch("https://game.test/api/nope");
    expect(res.status).toBe(404);
  });
});

describe("a run", () => {
  it("seats one player straight into the lobby", async () => {
    const a = await open(uniq("lobby"));
    a.send({ type: "join", playerId: "tommy" });
    const s = await a.state();
    expect(s.status).toBe("playing");
    expect(s.seats).toEqual(["tommy"]);
    expect(s.meta.game).toBe("Oddler");
    expect(s.view.phase).toBe("lobby");
    expect(s.view.parts).toEqual([]);
    a.ws.close();
  });

  it("starts a classic run with a prompt and no answer list in the view", async () => {
    const { p, asked } = await started(uniq("start"));
    expect(asked.view.mode).toBe("classic");
    expect(asked.view.colour).toBe("mint");
    expect(asked.view.roundNo).toBe(1);
    expect(asked.view.totalRounds).toBe(7);
    expect(typeof asked.view.round.prompt).toBe("string");
    expect(typeof asked.view.round.startedAt).toBe("number");
    // The accepted answers never travel to the client while the clock runs.
    expect(JSON.stringify(asked.view)).not.toMatch(/"answers"/);
    expect(JSON.stringify(asked.view)).not.toMatch(/"keys"/);
    p.ws.close();
  });

  it("keeps the round open on a miss and scores a listed answer", async () => {
    const { p, asked } = await started(uniq("answer"));
    p.send({ type: "action", action: { kind: "answer", text: "definitely not a real answer xq" } });
    const miss = await p.next((f) => f?.type === "state" && f.view?.round?.tries?.length === 1, "a recorded miss");
    expect(miss.view.phase).toBe("ask");
    p.frames.length = 0;

    // Skip ends the round too, with zero points — proves the reveal shape
    // without depending on which prompt the seed dealt.
    p.send({ type: "action", action: { kind: "skip" } });
    const reveal = await p.phase("reveal");
    expect(reveal.view.round.prompt).toBe(asked.view.round.prompt);
    expect(reveal.view.round.ended.tier).toBe(0);
    expect(reveal.view.round.ended.pts).toBe(0);
    expect(reveal.view.score).toBe(0);
    expect(reveal.view.history).toHaveLength(1);
    p.ws.close();
  });

  it("ignores a forged clock: `at` is stamped by the room", async () => {
    const { p } = await started(uniq("forged-clock"));
    // A client claiming a time a year from now would otherwise be "late".
    p.send({ type: "action", action: { kind: "skip", at: Date.now() + 365 * 86_400_000 } });
    const reveal = await p.phase("reveal");
    expect(reveal.view.round.ended.timedOut).toBe(false);
    p.ws.close();
  });

  it("refuses actions that do not fit the phase", async () => {
    const a = await open(uniq("phase"));
    a.send({ type: "join", playerId: "tommy" });
    await a.phase("lobby");
    a.frames.length = 0;
    a.send({ type: "action", action: { kind: "answer", text: "France" } });
    expect((await a.error()).error).toBe("no prompt open");
    a.frames.length = 0;
    a.send({ type: "action", action: { kind: "start", mode: "speedrun" } });
    expect((await a.error()).error).toBe("unknown mode");
    a.frames.length = 0;
    a.send({ type: "action", action: { kind: "dance" } });
    expect((await a.error()).error).toBe("unknown action");
    a.ws.close();
  });

  it("finishes a classic run after seven rounds and can restart", async () => {
    const { p } = await started(uniq("seven"));
    for (let i = 0; i < 7; i++) {
      p.send({ type: "action", action: { kind: "skip" } });
      await p.phase("reveal");
      p.frames.length = 0;
      p.send({ type: "action", action: { kind: "next" } });
      await p.next((f) => f?.type === "state" && f.view?.phase !== "reveal", "after next");
      p.frames.length = 0;
    }
    p.send({ type: "action", action: { kind: "restart" } });
    const lobby = await p.phase("lobby");
    expect(lobby.view.score).toBe(0);
    expect(lobby.view.parts).toEqual([]);
    p.ws.close();
  });

  it("ends an endless run on the third strike", async () => {
    const { p } = await started(uniq("endless"), "endless");
    for (let i = 0; i < 3; i++) {
      p.send({ type: "action", action: { kind: "skip" } });
      await p.phase("reveal");
      p.frames.length = 0;
      p.send({ type: "action", action: { kind: "next" } });
      const after = await p.next((f) => f?.type === "state" && f.view?.phase !== "reveal", "after next");
      p.frames.length = 0;
      if (i < 2) expect(after.view.phase).toBe("ask");
      else expect(after.view.phase).toBe("done");
    }
    p.ws.close();
  });
});

describe("isolation and persistence", () => {
  it("keeps two rooms completely separate", async () => {
    const one = await open(uniq("room-one"));
    const two = await open(uniq("room-two"));
    one.send({ type: "join", playerId: "alice" });
    two.send({ type: "join", playerId: "bob" });
    const s1 = await one.state();
    const s2 = await two.state();
    expect(s1.seats).toEqual(["alice"]);
    expect(s2.seats).toEqual(["bob"]);
    one.ws.close();
    two.ws.close();
  });

  it("survives a reconnect mid-run: the open prompt is still there", async () => {
    const room = uniq("persist");
    const { p, asked } = await started(room);
    p.ws.close();

    const again = await open(room);
    again.send({ type: "join", playerId: "tommy" });
    const restored = await again.state();
    expect(restored.status).toBe("playing");
    expect(restored.view.phase).toBe("ask");
    expect(restored.view.round.prompt).toBe(asked.view.round.prompt);
    again.ws.close();
  });

  it("seats two players in a code room; a third joiner spectates", async () => {
    const room = uniq("duo-seats");
    const h = await open(room);
    h.send({ type: "join", playerId: "host" });
    await h.phase("lobby");
    h.send({ type: "action", action: { kind: "sit", colour: "mint" } });
    await h.phase("duo-lobby");
    const g = await open(room);
    g.send({ type: "join", playerId: "guest" });
    await g.state();
    g.send({ type: "action", action: { kind: "sit", colour: "sand" } });
    const seated = await g.next((f) => f?.type === "state" && f.view?.duo?.players?.length === 2, "two seated");
    expect(seated.view.duo.seated).toBe(true);
    expect(seated.view.duo.host).toBe("host");

    const s = await open(room);
    s.send({ type: "join", playerId: "watcher" });
    const asWatcher = await s.state();
    expect(asWatcher.seats).toEqual(["host", "guest"]);
    expect(asWatcher.view.duo.seated).toBe(false);
    s.frames.length = 0;
    s.send({ type: "action", action: { kind: "skip" } });
    expect((await s.error()).error).toBe("spectators cannot act");
    h.ws.close(); g.ws.close(); s.ws.close();
  });
});

describe("duo", () => {
  /** Two seated players in a fresh code room, game started by the host. */
  async function duoStarted(room: string) {
    const h = await open(room);
    h.send({ type: "join", playerId: "host" });
    await h.phase("lobby");
    h.send({ type: "action", action: { kind: "sit", colour: "mint" } });
    await h.phase("duo-lobby");
    const g = await open(room);
    g.send({ type: "join", playerId: "guest" });
    await g.state();
    g.send({ type: "action", action: { kind: "sit", colour: "sand" } });
    await g.next((f) => f?.type === "state" && f.view?.duo?.players?.length === 2, "two seated");
    await h.next((f) => f?.type === "state" && f.view?.duo?.players?.length === 2, "two seated");
    h.frames.length = 0; g.frames.length = 0;
    h.send({ type: "action", action: { kind: "start", mode: "duo", seed: 3 } });
    const hv = await h.phase("ask");
    const gv = await g.phase("ask");
    h.frames.length = 0; g.frames.length = 0;
    return { h, g, hv, gv };
  }

  it("only the host starts, and only with a partner seated", async () => {
    const room = uniq("duo-start");
    const h = await open(room);
    h.send({ type: "join", playerId: "host" });
    await h.phase("lobby");
    h.send({ type: "action", action: { kind: "sit" } });
    await h.phase("duo-lobby");
    h.frames.length = 0;
    h.send({ type: "action", action: { kind: "start", mode: "duo" } });
    expect((await h.error()).error).toBe("waiting for your partner");
    h.ws.close();
  });

  it("alternates turns, shows the partner live typing, and pools the score", async () => {
    const { h, g, hv, gv } = await duoStarted(uniq("duo-play"));
    expect(hv.view.totalRounds).toBe(10);
    expect(hv.view.round.yourTurn).toBe(true);
    expect(gv.view.round.yourTurn).toBe(false);

    g.send({ type: "action", action: { kind: "answer", text: "France" } });
    expect((await g.error()).error).toBe("not your turn");
    g.frames.length = 0;

    h.send({ type: "action", action: { kind: "typing", text: "Liech" } });
    const typed = await g.next((f) => f?.type === "state" && f.view?.round?.typing === "Liech", "partner typing");
    expect(typed.view.round.typing).toBe("Liech");
    const echo = await h.next((f) => f?.type === "state" && f.view?.round, "host state");
    expect(echo.view.round.typing).toBeNull();
    h.frames.length = 0; g.frames.length = 0;

    h.send({ type: "action", action: { kind: "skip" } });
    await h.phase("reveal");
    await g.phase("reveal");
    h.frames.length = 0; g.frames.length = 0;
    g.send({ type: "action", action: { kind: "next" } });
    const r2 = await g.phase("ask");
    expect(r2.view.roundNo).toBe(2);
    expect(r2.view.round.yourTurn).toBe(true);
    expect(r2.view.duo.players.find((p: any) => p.id === "guest").isTurn).toBe(true);
    h.ws.close(); g.ws.close();
  });

  it("finishes after ten rounds with one team score, then the host can go again", async () => {
    const { h, g } = await duoStarted(uniq("duo-ten"));
    for (let i = 0; i < 10; i++) {
      const who = i % 2 === 0 ? h : g;
      who.send({ type: "action", action: { kind: "skip" } });
      await who.phase("reveal");
      h.frames.length = 0; g.frames.length = 0;
      who.send({ type: "action", action: { kind: "next" } });
      const after = await who.next((f) => f?.type === "state" && f.view?.phase !== "reveal", "after next");
      h.frames.length = 0; g.frames.length = 0;
      if (i < 9) expect(after.view.phase).toBe("ask"); else expect(after.view.phase).toBe("done");
    }
    const done = await (async () => { h.send({ type: "action", action: { kind: "start", mode: "duo" } }); return h.phase("ask"); })();
    // The second game opens on the other partner's turn.
    expect(done.view.round.yourTurn).toBe(false);
    expect(done.view.score).toBe(0);
    h.ws.close(); g.ws.close();
  });
});

describe("untrusted input", () => {
  it("rejects a non-JSON frame", async () => {
    const a = await open(uniq("bad-json"));
    a.ws.send("not json at all");
    expect((await a.error()).error).toBe("invalid json");
    a.ws.close();
  });

  it("rejects an unknown message type", async () => {
    const a = await open(uniq("bad-type"));
    a.send({ type: "definitely-not-a-thing" });
    expect((await a.error()).error).toMatch(/unknown message type/);
    a.ws.close();
  });

  it("refuses to act before joining", async () => {
    const a = await open(uniq("no-join"));
    a.send({ type: "action", action: { kind: "skip" } });
    expect((await a.error()).error).toBe("join first");
    a.ws.close();
  });

  it("refuses an oversized action payload", async () => {
    const a = await open(uniq("big-action"));
    a.send({ type: "join", playerId: "alice" });
    await a.state();
    a.frames.length = 0;
    a.send({ type: "action", action: { kind: "answer", text: "x".repeat(6_000) } });
    expect((await a.error()).error).toBe("action too large");
    a.ws.close();
  });
});

describe("the locker (/api/me)", () => {
  const token = "a".repeat(32);
  const headers = { "x-oddler-token": token, "content-type": "application/json" };

  it("needs a token", async () => {
    const res = await SELF.fetch("https://game.test/api/me");
    expect(res.status).toBe(401);
  });

  it("creates a fresh profile and lets the owner dress it within what is unlocked", async () => {
    const me = await (await SELF.fetch("https://game.test/api/me", { headers })).json();
    expect(me.level).toBe(1);
    expect(me.loadout).toEqual([]);
    expect(me.catalogue.some((p: any) => p.id === "acc-00" && p.level === 2 && p.unlocked === false)).toBe(true);

    // Nothing is unlocked at level 1, so a wished loadout is filtered to nothing.
    const put = await (await SELF.fetch("https://game.test/api/me", { method: "PUT", headers, body: JSON.stringify({ name: "  Tommy <b>!  ", loadout: ["acc-00", "horn-00"] }) })).json();
    expect(put.name).toBe("Tommy b");
    expect(put.loadout).toEqual([]);

    const bad = await SELF.fetch("https://game.test/api/me", { method: "PUT", headers, body: JSON.stringify({ colour: "neon" }) });
    expect(bad.status).toBe(400);
  });

  it("credits a finished solo game with xp and a game count", async () => {
    const tok = "b".repeat(32);
    const id = await (await SELF.fetch("https://game.test/api/me", { headers: { "x-oddler-token": tok } })).json().then((m: any) => m.id);
    const p = await open(uniq("award"));
    p.send({ type: "join", playerId: id });
    await p.phase("lobby");
    p.frames.length = 0;
    p.send({ type: "action", action: { kind: "start", mode: "classic", seed: 1 } });
    await p.phase("ask");
    for (let i = 0; i < 7; i++) {
      p.frames.length = 0;
      p.send({ type: "action", action: { kind: "skip" } });
      await p.phase("reveal");
      p.frames.length = 0;
      p.send({ type: "action", action: { kind: "next" } });
      await p.next((f) => f?.type === "state" && f.view?.phase !== "reveal", "after next");
    }
    const after = await (await SELF.fetch("https://game.test/api/me", { headers: { "x-oddler-token": tok } })).json();
    expect(after.games).toBe(1);
    expect(after.xp).toBe(20);
    p.ws.close();
  });
});
