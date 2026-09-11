// The server and browser run the exact same movement code at 60 Hz.
export const STEP = 1 / 60;
export const WORLD = { width: 1920, height: 1080 };
export const BODY = { width: 34, height: 58 };
export const MAX_PLAYERS = 8;
export const ROUND_TICKS = 60 * 180;
export const WIN_SCORE = 10;
export const FIRE_TICKS = 14;
export const COLORS = [
  "#69e8c5",
  "#ff9c64",
  "#b4a1ff",
  "#f4db70",
  "#79bcff",
  "#ff8fae",
  "#aada7b",
  "#f4f0e3",
];
export const PLATFORMS = [
  { x: 0, y: 1000, w: 1920, h: 80, solid: true },
  { x: 80, y: 795, w: 380, h: 30 },
  { x: 1460, y: 795, w: 380, h: 30 },
  { x: 640, y: 835, w: 640, h: 30 },
  { x: 420, y: 605, w: 320, h: 30 },
  { x: 1180, y: 605, w: 320, h: 30 },
  { x: 790, y: 415, w: 340, h: 30 },
  { x: 70, y: 410, w: 220, h: 30 },
  { x: 1630, y: 410, w: 220, h: 30 },
];
export const SPAWNS = [
  [210, 737],
  [1670, 737],
  [510, 547],
  [1320, 547],
  [875, 357],
  [990, 777],
  [100, 942],
  [1780, 942],
];
export const neutralInput = () => ({
  left: false,
  right: false,
  jump: false,
  down: false,
  fire: false,
  aim: 0,
});
export function cleanInput(value) {
  if (
    !value ||
    !Number.isSafeInteger(value.seq) ||
    value.seq < 0 ||
    !Number.isFinite(value.aim)
  )
    return null;
  return {
    seq: value.seq,
    left: value.left === true,
    right: value.right === true,
    jump: value.jump === true,
    down: value.down === true,
    fire: value.fire === true,
    aim: Math.atan2(Math.sin(value.aim), Math.cos(value.aim)),
  };
}
export function createPlayer(id, name, color = 0, spawn = 0) {
  const [x, y] = SPAWNS[spawn % SPAWNS.length];
  return {
    id,
    name,
    color,
    x,
    y,
    vx: 0,
    vy: 0,
    grounded: true,
    jumps: 0,
    coyote: 6,
    jumpBuffer: 0,
    jumpHeld: false,
    drop: 0,
    aim: 0,
    hp: 100,
    kills: 0,
    deaths: 0,
    cooldown: 0,
    respawn: 0,
    shield: 90,
    life: 0,
    ack: -1,
    bot: false,
    connected: true,
  };
}
const approach = (a, b, amount) =>
  a < b ? Math.min(a + amount, b) : Math.max(a - amount, b);
export function movePlayer(p, input, dt = STEP) {
  if (p.respawn > 0) return;
  p.aim = input.aim;
  const axis = Number(input.right) - Number(input.left);
  p.vx = approach(p.vx, axis * 390, (p.grounded ? 3300 : 2100) * dt);
  if (input.jump && !p.jumpHeld) p.jumpBuffer = 7;
  else p.jumpBuffer = Math.max(0, p.jumpBuffer - 1);
  p.jumpHeld = input.jump;
  p.coyote = p.grounded ? 6 : Math.max(0, p.coyote - 1);
  p.drop = Math.max(0, p.drop - 1);
  if (input.down && p.grounded && p.y + BODY.height < 995) {
    p.drop = 12;
    p.grounded = false;
    p.y += 4;
  }
  if (p.jumpBuffer > 0 && (p.coyote > 0 || p.jumps < 2)) {
    p.vy = p.coyote > 0 ? -770 : -710;
    p.jumps = p.coyote > 0 ? 1 : p.jumps + 1;
    p.jumpBuffer = 0;
    p.coyote = 0;
    p.grounded = false;
  }
  if (!input.jump && p.vy < -290) p.vy += 1700 * dt;
  p.vy = Math.min(p.vy + 1900 * dt, 1050);
  p.x = Math.max(0, Math.min(WORLD.width - BODY.width, p.x + p.vx * dt));
  const bottom = p.y + BODY.height;
  p.y += p.vy * dt;
  p.grounded = false;
  for (const platform of PLATFORMS) {
    if (p.drop && !platform.solid) continue;
    if (
      p.vy >= 0 &&
      bottom <= platform.y + 1 &&
      p.y + BODY.height >= platform.y &&
      p.x + BODY.width > platform.x &&
      p.x < platform.x + platform.w
    ) {
      p.y = platform.y - BODY.height;
      p.vy = 0;
      p.grounded = true;
      p.jumps = 0;
    }
  }
  if (p.y < 0) {
    p.y = 0;
    p.vy = Math.max(0, p.vy);
  }
}
export function muzzle(p) {
  return {
    x: p.x + BODY.width / 2 + Math.cos(p.aim) * 35,
    y: p.y + 29 + Math.sin(p.aim) * 35,
  };
}
// Swept segment/AABB intersection: a fast toast cannot tunnel through a rabbit.
export function segmentHit(x, y, nx, ny, box, padding = 0) {
  let near = 0,
    far = 1;
  for (const [start, end, min, max] of [
    [x, nx, box.x - padding, box.x + box.w + padding],
    [y, ny, box.y - padding, box.y + box.h + padding],
  ]) {
    const delta = end - start;
    if (Math.abs(delta) < 1e-9) {
      if (start < min || start > max) return null;
      continue;
    }
    const a = (min - start) / delta,
      b = (max - start) / delta;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return null;
  }
  return near;
}
export function chooseSpawn(players, seed = 0) {
  let best = seed % SPAWNS.length,
    distance = -1;
  for (let i = 0; i < SPAWNS.length; i++) {
    const candidate = (i + seed) % SPAWNS.length;
    const [x, y] = SPAWNS[candidate];
    const score = Math.min(
      ...players
        .filter((p) => !p.respawn)
        .map((p) => Math.hypot(x - p.x, y - p.y)),
      10000,
    );
    if (score > distance) {
      best = candidate;
      distance = score;
    }
  }
  return best;
}
