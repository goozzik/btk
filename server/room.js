import { randomUUID, randomBytes } from "node:crypto";
import {
  BODY,
  STEP,
  PLATFORMS,
  WORLD,
  FIRE_TICKS,
  ROUND_TICKS,
  WIN_SCORE,
  createPlayer,
  chooseSpawn,
  movePlayer,
  neutralInput,
  muzzle,
  segmentHit,
} from "../shared/game.js";

export class Room {
  constructor(code, practice = false) {
    this.code = code;
    this.practice = practice;
    this.players = new Map();
    this.bullets = [];
    this.events = [];
    this.tick = 0;
    this.remaining = ROUND_TICKS;
    this.round = 1;
    this.winner = null;
    this.intermission = 0;
    this.emptySince = Date.now();
    if (practice)
      ["Bułka", "Bagietka", "Chałka"].forEach((name, i) => {
        const entry = this.addPlayer(name, i + 1);
        entry.player.bot = true;
      });
  }
  addPlayer(name, color) {
    const player = createPlayer(
      randomUUID().slice(0, 8),
      name,
      color,
      chooseSpawn(
        [...this.players.values()].map((e) => e.player),
        this.players.size,
      ),
    );
    const entry = {
      player,
      token: randomBytes(24).toString("hex"),
      socket: null,
      queue: [],
      input: neutralInput(),
      lastInput: 0,
      lastSeq: -1,
      disconnectedAt: null,
    };
    this.players.set(player.id, entry);
    return entry;
  }
  humans() {
    return [...this.players.values()].filter((e) => !e.player.bot);
  }
  event(type, data) {
    this.events.push({
      id: `${this.tick}-${this.events.length}`,
      type,
      ...data,
    });
  }
  resetRound() {
    this.round++;
    this.remaining = ROUND_TICKS;
    this.winner = null;
    this.bullets = [];
    let i = 0;
    for (const entry of this.players.values()) {
      const p = entry.player;
      Object.assign(p, createPlayer(p.id, p.name, p.color, i++), {
        bot: p.bot,
        connected: p.connected,
        ack: p.ack,
        life: p.life + 1,
      });
      entry.queue = [];
      entry.input = neutralInput();
    }
  }
  botInput(p) {
    const targets = [...this.players.values()]
      .map((e) => e.player)
      .filter((q) => q.id !== p.id && !q.respawn && q.connected);
    const target = targets.sort(
      (a, b) =>
        Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
    )[0];
    if (!target) return neutralInput();
    const dx = target.x - p.x,
      dy = target.y - p.y;
    const phase = this.tick + p.color * 37;
    return {
      left: dx < -230 || (Math.abs(dx) < 140 && phase % 240 < 100),
      right: dx > 230 || (Math.abs(dx) < 140 && phase % 240 > 140),
      jump: phase % 62 < 24 && (dy < -70 || phase % 186 < 62),
      down: dy > 220 && phase % 120 < 8,
      fire: phase % 100 < 65 && Math.hypot(dx, dy) < 1000,
      aim:
        Math.atan2(dy + target.vy * 0.12, dx + target.vx * 0.12) +
        Math.sin(phase * 0.13) * 0.1,
    };
  }
  step(now = Date.now()) {
    this.tick++;
    for (const [id, entry] of this.players) {
      if (entry.disconnectedAt && now - entry.disconnectedAt > 20000)
        this.players.delete(id);
      // Acknowledge commands even while dead or between rounds. Otherwise a
      // paused simulation can fill the client's prediction buffer permanently.
      if (!entry.player.bot) {
        const command = entry.queue.shift();
        if (command) {
          entry.input = command;
          entry.player.ack = command.seq;
        }
      }
    }
    if (this.intermission > 0) {
      if (--this.intermission === 0) this.resetRound();
      return;
    }
    if (!this.humans().some((e) => e.socket)) return;
    this.remaining--;
    for (const entry of this.players.values()) {
      const p = entry.player;
      if (p.respawn > 0) {
        if (--p.respawn === 0) {
          const fresh = createPlayer(
            p.id,
            p.name,
            p.color,
            chooseSpawn(
              [...this.players.values()]
                .map((e) => e.player)
                .filter((q) => q.id !== p.id),
              this.tick,
            ),
          );
          Object.assign(p, fresh, {
            kills: p.kills,
            deaths: p.deaths,
            bot: p.bot,
            connected: p.connected,
            ack: p.ack,
            life: p.life + 1,
          });
          entry.queue = [];
          entry.input = neutralInput();
        }
        continue;
      }
      let input;
      if (p.bot) input = this.botInput(p);
      else {
        input =
          p.connected && now - entry.lastInput < 250
            ? entry.input
            : neutralInput();
      }
      movePlayer(p, input);
      p.shield = Math.max(0, p.shield - 1);
      p.cooldown = Math.max(0, p.cooldown - 1);
      if (input.fire && !p.cooldown && p.connected) {
        p.cooldown = FIRE_TICKS;
        p.shield = 0;
        const pos = muzzle(p);
        this.bullets.push({
          id: `${p.id}-${this.tick}`,
          owner: p.id,
          ...pos,
          vx: Math.cos(p.aim) * 1050,
          vy: Math.sin(p.aim) * 1050,
          ttl: 90,
        });
        this.event("shot", { player: p.id, x: pos.x, y: pos.y, aim: p.aim });
      }
    }
    const alive = [];
    for (const b of this.bullets) {
      const nx = b.x + b.vx * STEP,
        ny = b.y + b.vy * STEP;
      let hit = null,
        fraction = 2;
      for (const platform of PLATFORMS) {
        const t = segmentHit(b.x, b.y, nx, ny, platform, 3);
        if (t !== null && t < fraction) {
          fraction = t;
          hit = "wall";
        }
      }
      for (const { player: p } of this.players.values()) {
        if (p.id === b.owner || p.respawn || p.shield || !p.connected) continue;
        const t = segmentHit(
          b.x,
          b.y,
          nx,
          ny,
          { x: p.x, y: p.y, w: BODY.width, h: BODY.height },
          4,
        );
        if (t !== null && t < fraction) {
          fraction = t;
          hit = p;
        }
      }
      if (hit) {
        const x = b.x + (nx - b.x) * fraction,
          y = b.y + (ny - b.y) * fraction;
        this.event("hit", {
          x,
          y,
          target: hit === "wall" ? null : hit.id,
          owner: b.owner,
        });
        if (hit !== "wall") {
          hit.hp = Math.max(0, hit.hp - 34);
          if (!hit.hp) {
            hit.respawn = 120;
            hit.deaths++;
            hit.vx = 0;
            hit.vy = 0;
            const shooter = this.players.get(b.owner)?.player;
            if (shooter) shooter.kills++;
            this.event("kill", {
              killer: shooter?.name ?? "Toster",
              victim: hit.name,
              player: hit.id,
              x,
              y,
            });
          }
        }
      } else if (
        --b.ttl > 0 &&
        nx >= 0 &&
        nx < WORLD.width &&
        ny >= 0 &&
        ny < WORLD.height
      ) {
        b.x = nx;
        b.y = ny;
        alive.push(b);
      }
    }
    this.bullets = alive;
    const sorted = [...this.players.values()]
      .map((e) => e.player)
      .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
    if (this.remaining <= 0 || sorted.some((p) => p.kills >= WIN_SCORE)) {
      const first = sorted[0],
        second = sorted[1];
      this.winner =
        first &&
        (!second ||
          first.kills !== second.kills ||
          first.deaths !== second.deaths)
          ? first.name
          : "Remis";
      this.intermission = 480;
      this.event("round", { winner: this.winner });
    }
  }
  snapshot() {
    return {
      type: "state",
      tick: this.tick,
      time: this.tick * STEP * 1000,
      round: this.round,
      remaining: this.remaining,
      winner: this.winner,
      intermission: this.intermission,
      players: [...this.players.values()].map((e) => e.player),
      bullets: this.bullets,
      events: this.events,
    };
  }
}
