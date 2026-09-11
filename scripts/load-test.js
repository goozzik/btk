import { performance, monitorEventLoopDelay } from "node:perf_hooks";
import assert from "node:assert/strict";
import { WebSocket } from "ws";
import { createGameServer } from "../server.js";
import { neutralInput } from "../shared/game.js";

const game = createGameServer();
await new Promise((resolve) => game.server.listen(0, "127.0.0.1", resolve));
const url = `ws://127.0.0.1:${game.server.address().port}/ws`;
const clients = [],
  seconds = Number(process.env.LOAD_SECONDS || 15),
  roomCount = Number(process.env.LOAD_ROOMS || 4);
let messages = 0,
  bytes = 0;
async function client(room) {
  const ws = new WebSocket(url);
  let seq = 0;
  const welcome = await new Promise((resolve, reject) => {
    ws.on("error", reject);
    ws.on("open", () =>
      ws.send(
        JSON.stringify({
          type: "join",
          mode: room ? "join" : "create",
          room,
          name: "Load test",
        }),
      ),
    );
    ws.on("message", (raw) => {
      messages++;
      bytes += raw.length;
      const msg = JSON.parse(raw);
      if (msg.type === "welcome") resolve(msg);
    });
  });
  const timer = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const commands = Array.from({ length: 2 }, () => ({
      ...neutralInput(),
      seq: seq++,
      right: seq % 360 < 180,
      left: seq % 360 >= 180,
      jump: seq % 90 < 25,
      fire: true,
      aim: Math.sin(seq * 0.04) * Math.PI,
    }));
    ws.send(JSON.stringify({ type: "input", commands }));
  }, 1000 / 30);
  clients.push({ ws, timer });
  return welcome.room;
}
try {
  for (let i = 0; i < roomCount; i++) {
    const room = await client();
    for (let j = 0; j < 7; j++) await client(room);
  }
  const lag = monitorEventLoopDelay({ resolution: 10 });
  lag.enable();
  const start = performance.now(),
    initial = game.stats.steps;
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  const elapsed = (performance.now() - start) / 1000,
    hz = (game.stats.steps - initial) / elapsed;
  lag.disable();
  console.log(
    JSON.stringify(
      {
        players: clients.length,
        rooms: roomCount,
        seconds: +elapsed.toFixed(1),
        simulationHz: +hz.toFixed(2),
        maxStepMs: +game.stats.maxStepMs.toFixed(2),
        eventLoopP99Ms: +(lag.percentile(99) / 1e6).toFixed(2),
        droppedTicks: game.stats.droppedTicks,
        snapshotsReceived: messages,
        totalKBPerSecond: +(bytes / elapsed / 1024).toFixed(1),
      },
      null,
      2,
    ),
  );
  assert.ok(hz > 57, `Simulation fell below 57 Hz: ${hz}`);
  assert.equal(
    clients.filter((c) => c.ws.readyState === WebSocket.OPEN).length,
    roomCount * 8,
  );
  assert.equal(game.stats.droppedTicks, 0);
} finally {
  for (const { ws, timer } of clients) {
    clearInterval(timer);
    ws.terminate();
  }
  await game.close();
}
