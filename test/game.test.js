import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createPlayer,
  movePlayer,
  neutralInput,
  STEP,
  BODY,
  cleanInput,
  segmentHit,
} from "../shared/game.js";
import { Room } from "../server/room.js";

test("movement is bounded, lands on shelves and stops after release", () => {
  const p = createPlayer("p", "P");
  for (let i = 0; i < 120; i++)
    movePlayer(p, { ...neutralInput(), right: true });
  assert.ok(p.x > 650);
  assert.equal(p.vx, 390);
  for (let i = 0; i < 90; i++) movePlayer(p, neutralInput());
  assert.equal(p.vx, 0);
  assert.equal(p.grounded, true);
  assert.equal(p.y + BODY.height, 1000);
  Object.assign(p, { x: 900, y: 650, vy: 100, grounded: false });
  for (let i = 0; i < 90; i++) movePlayer(p, neutralInput());
  assert.equal(p.y + BODY.height, 835);
  for (let i = 0; i < 1200; i++)
    movePlayer(p, { ...neutralInput(), left: true });
  assert.equal(p.x, 0);
  assert.equal(p.y + BODY.height, 1000);
});
test("double jump works, holding jump does not auto-repeat, third jump is rejected", () => {
  const p = createPlayer("p", "P");
  movePlayer(p, { ...neutralInput(), jump: true });
  assert.equal(p.jumps, 1);
  assert.ok(p.vy < 0);
  for (let i = 0; i < 10; i++) movePlayer(p, { ...neutralInput(), jump: true });
  assert.equal(p.jumps, 1);
  movePlayer(p, neutralInput());
  movePlayer(p, { ...neutralInput(), jump: true });
  assert.equal(p.jumps, 2);
  movePlayer(p, neutralInput());
  const velocity = p.vy;
  movePlayer(p, { ...neutralInput(), jump: true });
  assert.equal(p.jumps, 2);
  assert.ok(p.vy > velocity);
});
test("drop-through shelves keeps floor solid", () => {
  const p = createPlayer("p", "P");
  for (let i = 0; i < 60; i++) movePlayer(p, { ...neutralInput(), down: true });
  assert.equal(p.y + BODY.height, 1000);
  assert.equal(p.grounded, true);
});
test("client replay matches server simulation", () => {
  const server = createPlayer("p", "P"),
    client = structuredClone(server),
    commands = [];
  for (let i = 0; i < 180; i++)
    commands.push({
      ...neutralInput(),
      seq: i,
      right: i < 75,
      left: i > 100,
      jump: i === 20 || i === 40,
    });
  for (const input of commands.slice(0, 100)) movePlayer(server, input, STEP);
  for (const input of commands) movePlayer(client, input, STEP);
  const replay = structuredClone(server);
  for (const input of commands.slice(100)) movePlayer(replay, input, STEP);
  assert.deepEqual(replay, client);
});
test("swept projectile collision catches tunnelling and parallel misses", () => {
  assert.equal(segmentHit(0, 10, 200, 10, { x: 80, y: 0, w: 30, h: 30 }), 0.4);
  assert.equal(segmentHit(0, 50, 200, 50, { x: 80, y: 0, w: 30, h: 30 }), null);
});
test("input validation discards non-finite aim and ignores client positions/damage", () => {
  assert.equal(cleanInput({ seq: 0, aim: Infinity }), null);
  assert.equal(cleanInput({ seq: -1, aim: 0 }), null);
  const command = cleanInput({
    seq: 1,
    aim: 0,
    right: "yes",
    x: 999999,
    damage: 100,
  });
  assert.equal(command.right, false);
  assert.equal(command.x, undefined);
  assert.equal(command.damage, undefined);
});
function setupDuel() {
  const room = new Room("DUEL");
  const a = room.addPlayer("A", 0),
    b = room.addPlayer("B", 1);
  a.socket = {};
  b.socket = {};
  Object.assign(a.player, { x: 500, y: 942, shield: 0 });
  Object.assign(b.player, { x: 700, y: 942, shield: 0 });
  a.input = { ...neutralInput(), fire: true };
  a.lastInput = Date.now() + 100000;
  return { room, a, b };
}
test("server owns damage, kill score, respawn and temporary spawn protection", () => {
  const { room, a, b } = setupDuel();
  for (let i = 0; i < 50; i++) room.step();
  assert.equal(a.player.kills, 1);
  assert.equal(b.player.deaths, 1);
  assert.ok(b.player.respawn > 0);
  assert.ok(room.events.some((e) => e.type === "kill" && e.killer === "A"));
  a.input = neutralInput();
  for (let i = 0; i < 130; i++) room.step();
  assert.equal(b.player.respawn, 0);
  assert.equal(b.player.hp, 100);
  assert.ok(b.player.shield > 0);
});
test("toaster fire rate is server limited", () => {
  const { room, a, b } = setupDuel();
  b.player.shield = 10000;
  for (let i = 0; i < 60; i++) room.step();
  assert.equal(
    room.events.filter((e) => e.type === "shot" && e.player === a.player.id)
      .length,
    5,
  );
});
test("round ends at 10 kills, resets and still acknowledges input during intermission", () => {
  const { room, a } = setupDuel();
  a.player.kills = 10;
  room.step();
  assert.equal(room.winner, "A");
  a.queue.push({ ...neutralInput(), seq: 52 });
  room.step();
  assert.equal(a.player.ack, 52);
  for (let i = 0; i < 480; i++) room.step();
  assert.equal(room.round, 2);
  assert.equal(a.player.kills, 0);
  assert.equal(room.winner, null);
});
