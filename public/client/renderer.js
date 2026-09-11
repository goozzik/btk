import { WORLD, PLATFORMS, COLORS, BODY, createPlayer } from "/shared/game.js";

// Source rectangles keep the generated poses aligned to a shared foot anchor.
const FRAMES = [
  [32, 130, 268, 474],
  [338, 148, 286, 457],
  [633, 174, 304, 430],
  [944, 151, 300, 456],
  [15, 711, 323, 449],
  [335, 685, 286, 380],
  [655, 644, 287, 515],
  [968, 823, 279, 337],
];
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.camera = { x: WORLD.width / 2, y: WORLD.height / 2 };
    this.particles = [];
    this.animations = new Map();
    this.shake = 0;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.assets = {};
    this.ready = Promise.all(
      Object.entries({
        bunny: "/assets/bunny-atlas.png",
        toaster: "/assets/toaster.png",
        toast: "/data/img/toast.png",
      }).map(async ([key, src]) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        this.assets[key] = img;
      }),
    );
    this.background = this.makeBackground();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  resize() {
    this.width = innerWidth;
    this.height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.dpr = dpr;
  }
  makeBackground() {
    const canvas = document.createElement("canvas");
    canvas.width = WORLD.width;
    canvas.height = WORLD.height;
    const c = canvas.getContext("2d");
    const gradient = c.createLinearGradient(0, 0, 0, WORLD.height);
    gradient.addColorStop(0, "#142b3d");
    gradient.addColorStop(1, "#203e4b");
    c.fillStyle = gradient;
    c.fillRect(0, 0, 1920, 1080);
    // Tilework, framing and shelves are cached once, outside the render loop.
    c.strokeStyle = "#53768616";
    c.lineWidth = 2;
    for (let y = 80; y < 1080; y += 80) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(1920, y);
      c.stroke();
      for (let x = ((y / 80) % 2) * 80; x < 1920; x += 160) {
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x, y + 80);
        c.stroke();
      }
    }
    for (const x of [340, 1580]) {
      c.fillStyle = "#0e2535";
      c.fillRect(x - 14, 0, 28, 1000);
      c.fillStyle = "#365262";
      c.fillRect(x - 3, 0, 6, 1000);
      for (let y = 90; y < 1000; y += 180) {
        c.fillStyle = "#526774";
        c.fillRect(x - 17, y, 34, 12);
      }
    }
    for (const x of [420, 1090]) {
      c.fillStyle = "#101e2b";
      c.fillRect(x, 95, 420, 250);
      c.fillStyle = "#305969";
      c.fillRect(x + 10, 105, 400, 230);
      const glow = c.createLinearGradient(x, 110, x, 330);
      glow.addColorStop(0, "#72a29b55");
      glow.addColorStop(1, "#13313d");
      c.fillStyle = glow;
      c.fillRect(x + 14, 109, 392, 222);
      c.fillStyle = "#142d3b";
      c.fillRect(x + 202, 105, 12, 230);
      c.fillRect(x + 10, 212, 400, 10);
      c.fillStyle = "#92c9b027";
      c.beginPath();
      c.moveTo(x + 20, 110);
      c.lineTo(x + 90, 110);
      c.lineTo(x + 275, 330);
      c.lineTo(x + 205, 330);
      c.fill();
    }
    c.fillStyle = "#91acac15";
    c.font = "900 116px Arial";
    c.textAlign = "center";
    c.fillText("BREAD OR ALIVE", 960, 550);
    c.font = "14px monospace";
    c.fillStyle = "#95c4b143";
    c.fillText("KITCHEN 01     /     AFTER HOURS", 960, 583);
    for (const x of [160, 950, 1750]) {
      c.fillStyle = "#0a1e2c";
      c.fillRect(x, 0, 6, 55);
      c.fillStyle = "#527078";
      c.fillRect(x - 65, 50, 136, 12);
      c.fillStyle = "#b8f2d4";
      c.fillRect(x - 59, 62, 124, 5);
      const glow = c.createLinearGradient(0, 68, 0, 385);
      glow.addColorStop(0, "#a1ebbf15");
      glow.addColorStop(1, "#a1ebbf00");
      c.fillStyle = glow;
      c.beginPath();
      c.moveTo(x - 60, 68);
      c.lineTo(x + 65, 68);
      c.lineTo(x + 180, 380);
      c.lineTo(x - 180, 380);
      c.fill();
    }
    // A warm service hatch balances the cool arena and establishes the kitchen.
    c.fillStyle = "#142632";
    c.fillRect(840, 890, 240, 110);
    c.strokeStyle = "#576564";
    c.lineWidth = 4;
    c.strokeRect(850, 900, 220, 90);
    c.fillStyle = "#c57c4733";
    c.fillRect(858, 908, 204, 74);
    c.fillStyle = "#db9a6844";
    for (let y = 921; y < 980; y += 17) c.fillRect(866, y, 188, 3);
    for (const p of PLATFORMS) {
      c.fillStyle = "#07182455";
      c.fillRect(p.x + 10, p.y + 20, p.w, p.h + 16);
      c.fillStyle = p.solid ? "#20323b" : "#3c5963";
      c.fillRect(p.x, p.y, p.w, p.h);
      c.fillStyle = "#99b6ad";
      c.fillRect(p.x, p.y, p.w, 5);
      c.fillStyle = "#182d38";
      c.fillRect(p.x, p.y + 10, p.w, p.h - 10);
      c.fillStyle = "#ffa36e";
      c.fillRect(p.x, p.y, Math.min(36, p.w), 5);
      c.fillRect(p.x + p.w - 36, p.y, 36, 5);
      if (!p.solid) {
        for (const x of [p.x + 20, p.x + p.w - 30]) {
          c.strokeStyle = "#42616c";
          c.lineWidth = 5;
          c.beginPath();
          c.moveTo(x, p.y + 29);
          c.lineTo(x, p.y + 62);
          c.lineTo(x + 29, p.y + 29);
          c.stroke();
        }
        c.fillStyle = "#79998e";
        for (let x = p.x + 65; x < p.x + p.w - 40; x += 80)
          c.fillRect(x, p.y + 15, 4, 4);
      } else {
        c.fillStyle = "#0f2431";
        for (let x = 20; x < 1920; x += 120) c.fillRect(x, 1020, 100, 60);
      }
    }
    return canvas;
  }
  screenToWorld(x, y) {
    return {
      x: (x - this.width / 2) / this.scale + this.camera.x,
      y: (y - this.height / 2) / this.scale + this.camera.y,
    };
  }
  burst(x, y, color, count = 12, speed = 170) {
    if (this.reduced) count = Math.min(count, 4);
    for (let i = 0; i < count && this.particles.length < 220; i++) {
      const a = Math.random() * Math.PI * 2,
        s = speed * (0.3 + Math.random());
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 55,
        life: 0.2 + Math.random() * 0.35,
        max: 0.55,
        color,
        size: 2 + Math.random() * 4,
      });
    }
  }
  event(event, localId) {
    if (event.type === "shot") {
      const anim = this.animations.get(event.player);
      if (anim) anim.recoil = 1;
      this.burst(event.x, event.y, "#ffd888", 4, 95);
    }
    if (event.type === "hit") {
      this.burst(
        event.x,
        event.y,
        event.target ? "#fff3c0" : "#d6a267",
        event.target ? 17 : 8,
        190,
      );
      const anim = this.animations.get(event.target);
      if (anim) anim.hit = 0.15;
      if (event.target === localId && !this.reduced) this.shake = 5;
    }
    if (event.type === "kill") this.burst(event.x, event.y, "#e9e4de", 30, 290);
  }
  bunny(p, time, dt, localId) {
    const c = this.ctx;
    let anim = this.animations.get(p.id);
    if (!anim) {
      anim = { phase: 0, recoil: 0, hit: 0, grounded: p.grounded, land: 0 };
      this.animations.set(p.id, anim);
    }
    anim.phase += Math.abs(p.vx) * dt * 0.042;
    if (p.grounded && !anim.grounded) {
      anim.land = 0.14;
      this.burst(p.x + 17, p.y + 58, "#95b5b2", 5, 70);
    }
    anim.grounded = p.grounded;
    anim.land = Math.max(0, anim.land - dt);
    anim.recoil = Math.max(0, anim.recoil - dt * 8);
    anim.hit = Math.max(0, anim.hit - dt);
    if (p.respawn || !p.connected) return;
    const color = COLORS[p.color];
    const facing = Math.cos(p.aim) >= 0 ? 1 : -1;
    const frame = !p.grounded
      ? p.vy < 0
        ? 5
        : 6
      : anim.land > 0
        ? 7
        : Math.abs(p.vx) > 25
          ? 1 + (Math.floor(anim.phase) % 4)
          : 0;
    const bob =
      p.grounded && Math.abs(p.vx) < 25
        ? Math.sin(time * 3 + p.color) * 1.3
        : 0;
    c.fillStyle = "#06152166";
    c.beginPath();
    c.ellipse(p.x + 17, p.y + 60, 27, 5, 0, 0, Math.PI * 2);
    c.fill();
    if (p.shield) {
      c.strokeStyle = `${color}88`;
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(p.x + 17, p.y + 17, 43, 53, 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.save();
    c.translate(p.x + 17, p.y + 58 + bob);
    c.scale(facing, 1);
    if (this.assets.bunny) {
      const [sx, sy, sw, sh] = FRAMES[frame],
        factor = this.assets.bunny.width / 1254,
        s = 0.19;
      c.drawImage(
        this.assets.bunny,
        sx * factor,
        sy * factor,
        sw * factor,
        sh * factor,
        (-sw * s) / 2,
        -sh * s,
        sw * s,
        sh * s,
      );
    }
    c.restore();
    // The original toaster remains a separately aimed weapon with recoil.
    c.save();
    c.translate(p.x + 17, p.y + 29);
    c.rotate(p.aim);
    c.scale(1, facing);
    c.fillStyle = color;
    c.fillRect(4 - anim.recoil * 4, -4, 12, 8);
    if (this.assets.toaster) {
      c.imageSmoothingEnabled = false;
      c.drawImage(this.assets.toaster, 10 - anim.recoil * 6, -15, 34, 31);
      c.imageSmoothingEnabled = true;
    }
    if (anim.recoil > 0.55) {
      c.fillStyle = "#ffe7a3";
      c.beginPath();
      c.moveTo(42, -6);
      c.lineTo(60, 0);
      c.lineTo(42, 6);
      c.fill();
    }
    c.restore();
    if (anim.hit > 0) {
      c.strokeStyle = "#fff2b8";
      c.lineWidth = 2;
      c.strokeRect(p.x - 3, p.y - 5, BODY.width + 6, BODY.height + 8);
    }
    const labelY = p.y - 47;
    c.font = "bold 15px Arial";
    c.textAlign = "center";
    c.lineWidth = 4;
    c.strokeStyle = "#10202d";
    const label = `${p.id === localId ? "▼ " : ""}${p.name}${p.bot ? " · BOT" : ""}`;
    c.strokeText(label, p.x + 17, labelY);
    c.fillStyle = color;
    c.fillText(label, p.x + 17, labelY);
    if (p.hp < 100) {
      c.fillStyle = "#102432";
      c.fillRect(p.x - 4, labelY + 6, 42, 4);
      c.fillStyle = color;
      c.fillRect(p.x - 4, labelY + 6, (42 * p.hp) / 100, 4);
    }
  }
  draw(state, localId, time, dt, menu = false, pointer = null) {
    const c = this.ctx;
    const self = state?.players.find((p) => p.id === localId);
    const fullScale = Math.min(
      this.width / WORLD.width,
      (this.height - 130) / WORLD.height,
    );
    this.scale = menu
      ? Math.max(this.width / 1920, this.height / 1080)
      : Math.max(
          fullScale,
          Math.min(this.width / 1250, (this.height - 130) / 780),
        );
    if (this.width < 650)
      this.scale = menu
        ? this.height / 1080
        : Math.max(this.width / 760, (this.height - 130) / 900);
    const viewW = this.width / this.scale,
      viewH = this.height / this.scale;
    let targetX = menu
      ? WORLD.width * 0.49
      : self
        ? self.x + 17 + Math.cos(self.aim) * 90
        : WORLD.width / 2;
    let targetY = menu
      ? WORLD.height * 0.53
      : self
        ? self.y - 65
        : WORLD.height / 2;
    targetX =
      viewW >= WORLD.width
        ? WORLD.width / 2
        : Math.max(viewW / 2, Math.min(WORLD.width - viewW / 2, targetX));
    targetY =
      viewH >= WORLD.height
        ? WORLD.height / 2
        : Math.max(
            viewH / 2 - 30,
            Math.min(WORLD.height - viewH / 2 + 60, targetY),
          );
    const follow = 1 - Math.exp(-dt * 7);
    this.camera.x += (targetX - this.camera.x) * follow;
    this.camera.y += (targetY - this.camera.y) * follow;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = "#101d28";
    c.fillRect(0, 0, this.width, this.height);
    c.save();
    const shake = this.reduced ? 0 : this.shake;
    c.translate(
      this.width / 2 + (Math.random() - 0.5) * shake,
      this.height / 2 + (Math.random() - 0.5) * shake,
    );
    c.scale(this.scale, this.scale);
    c.translate(-this.camera.x, -this.camera.y);
    c.drawImage(this.background, 0, 0);
    for (let i = 0; i < 18; i++) {
      const x = (i * 137 + time * (6 + (i % 4))) % 1920,
        y = 110 + ((i * 79) % 860) + Math.sin(time * 0.5 + i) * 15;
      c.fillStyle = "#c1e4c026";
      c.fillRect(x, y, 2, 2);
    }
    for (const p of state?.players ?? []) this.bunny(p, time, dt, localId);
    for (const b of state?.bullets ?? []) {
      c.strokeStyle = "#ffc16b66";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(b.x - b.vx * 0.025, b.y - b.vy * 0.025);
      c.lineTo(b.x, b.y);
      c.stroke();
      c.save();
      c.translate(b.x, b.y);
      c.rotate(time * 15);
      if (this.assets.toast) {
        c.imageSmoothingEnabled = false;
        c.drawImage(this.assets.toast, -9, -9, 18, 18);
        c.imageSmoothingEnabled = true;
      }
      c.restore();
    }
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 550 * dt;
      c.globalAlpha = Math.max(0, p.life / p.max);
      c.fillStyle = p.color;
      c.fillRect(p.x, p.y, p.size, p.size);
    }
    c.globalAlpha = 1;
    this.particles = this.particles.filter((p) => p.life > 0);
    this.shake = Math.max(0, this.shake - dt * 25);
    c.restore();
    if (!menu && pointer && !self?.respawn) {
      c.strokeStyle = "#f5edd8";
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(pointer.x, pointer.y, 7, 0, Math.PI * 2);
      c.stroke();
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        c.beginPath();
        c.moveTo(pointer.x + dx * 11, pointer.y + dy * 11);
        c.lineTo(pointer.x + dx * 15, pointer.y + dy * 15);
        c.stroke();
      }
    }
    if (this.animations.size > 32) {
      const ids = new Set(state?.players.map((p) => p.id));
      for (const id of this.animations.keys())
        if (!ids.has(id)) this.animations.delete(id);
    }
  }
  demo(time) {
    const a = createPlayer("demo-a", "Bułka", 0, 3),
      b = createPlayer("demo-b", "Bagietka", 1, 1),
      d = createPlayer("demo-c", "Chałka", 2, 4);
    a.x = 1300 + Math.sin(time * 0.6) * 65;
    a.vx = Math.cos(time * 0.6) * 180;
    a.aim = 1.05;
    b.x = 1620 + Math.sin(time * 0.8) * 90;
    b.vx = Math.cos(time * 0.8) * 180;
    b.aim = -2.2;
    d.x = 930 + Math.sin(time * 0.7) * 50;
    d.vx = 120;
    d.aim = 0.3;
    return {
      players: [a, b, d].map((p) => ({ ...p, shield: 0 })),
      bullets: [],
    };
  }
}
