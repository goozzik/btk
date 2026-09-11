import { test } from "node:test";
import assert from "node:assert/strict";
import { WebSocket } from "ws";
import { createGameServer } from "../server.js";
import { neutralInput } from "../shared/game.js";

async function setup(t) {
  const game = createGameServer();
  await new Promise((resolve) => game.server.listen(0, "127.0.0.1", resolve));
  t.after(() => game.close());
  return {
    ...game,
    base: `http://127.0.0.1:${game.server.address().port}`,
    url: `ws://127.0.0.1:${game.server.address().port}/ws`,
  };
}
function next(ws, type, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off("message", listener);
      reject(new Error(`Timed out waiting for ${type}`));
    }, 3000);
    const listener = (raw) => {
      const data = JSON.parse(raw.toString());
      if (data.type === type && predicate(data)) {
        clearTimeout(timer);
        ws.off("message", listener);
        resolve(data);
      }
    };
    ws.on("message", listener);
  });
}
async function join(url, options = {}) {
  const ws = new WebSocket(url);
  const welcome = next(ws, "welcome");
  ws.on("open", () =>
    ws.send(
      JSON.stringify({
        type: "join",
        name: "Tester",
        mode: "quick",
        ...options,
      }),
    ),
  );
  return { ws, welcome: await welcome };
}
test("two real WebSocket clients see the same room and authoritative movement", async (t) => {
  const { url } = await setup(t);
  const a = await join(url, { mode: "create", name: "A" });
  const b = await join(url, { mode: "join", room: a.welcome.room, name: "B" });
  assert.equal(a.welcome.room, b.welcome.room);
  const x = a.welcome.state.players.find((p) => p.id === a.welcome.id).x;
  const observed = next(b.ws, "state", (state) =>
    state.players.some((p) => p.id === a.welcome.id && p.ack >= 5),
  );
  a.ws.send(
    JSON.stringify({
      type: "input",
      commands: Array.from({ length: 6 }, (_, seq) => ({
        ...neutralInput(),
        seq,
        right: true,
      })),
    }),
  );
  const state = await observed;
  const p = state.players.find((p) => p.id === a.welcome.id);
  assert.ok(p.x > x);
  assert.equal(state.players.length, 2);
});
test("rooms are isolated and missing room codes return a visible error", async (t) => {
  const { url } = await setup(t);
  const a = await join(url, { mode: "create" }),
    b = await join(url, { mode: "create" });
  assert.notEqual(a.welcome.room, b.welcome.room);
  assert.equal(b.welcome.state.players.length, 1);
  const ws = new WebSocket(url),
    error = next(ws, "error");
  ws.on("open", () =>
    ws.send(JSON.stringify({ type: "join", mode: "join", room: "MISSING" })),
  );
  assert.match((await error).message, /nie istnieje/);
});
test("resume token reconnects to the same player and preserves score", async (t) => {
  const { url, rooms } = await setup(t);
  const a = await join(url, { mode: "create" });
  const room = rooms.get(a.welcome.room);
  room.players.get(a.welcome.id).player.kills = 4;
  await new Promise((resolve) => {
    a.ws.on("close", resolve);
    a.ws.close();
  });
  const b = await join(url, {
    mode: "join",
    room: a.welcome.room,
    token: a.welcome.token,
  });
  assert.equal(b.welcome.id, a.welcome.id);
  assert.equal(b.welcome.state.players[0].kills, 4);
});
test("malformed JSON and oversized packets cannot crash the server", async (t) => {
  const { url, base } = await setup(t);
  const a = await join(url);
  const closed = new Promise((resolve) => a.ws.on("close", resolve));
  a.ws.send("{");
  assert.equal(await closed, 1008);
  const b = await join(url);
  const closedB = new Promise((resolve) => b.ws.on("close", resolve));
  b.ws.send("x".repeat(5000));
  assert.equal(await closedB, 1009);
  assert.equal((await (await fetch(`${base}/health`)).json()).ok, true);
});
test("capacity is limited to 8 and client position/kill claims have no effect", async (t) => {
  const { url } = await setup(t);
  const a = await join(url, { mode: "create" });
  for (let i = 0; i < 7; i++)
    await join(url, { mode: "join", room: a.welcome.room });
  const ws = new WebSocket(url),
    error = next(ws, "error");
  ws.on("open", () =>
    ws.send(
      JSON.stringify({ type: "join", mode: "join", room: a.welcome.room }),
    ),
  );
  assert.match((await error).message, /pełny/);
  a.ws.send(JSON.stringify({ type: "killPlayer", id: a.welcome.id }));
  a.ws.send(JSON.stringify({ type: "updatePlayerState", x: 99999, y: -99999 }));
  const state = await next(a.ws, "state");
  const p = state.players.find((p) => p.id === a.welcome.id);
  assert.equal(p.kills, 0);
  assert.ok(p.x < 1920);
});
test("HTTP serves the game and shared physics but not project files", async (t) => {
  const { base } = await setup(t);
  for (const file of [
    "/",
    "/client/main.js",
    "/shared/game.js",
    "/assets/bunny-atlas.png",
  ])
    assert.equal((await fetch(base + file)).status, 200, file);
  for (const file of [
    "/server.js",
    "/package.json",
    "/.git/config",
    "/../server.js",
  ])
    assert.equal((await fetch(base + file)).status, 404, file);
});
