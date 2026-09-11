import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";
import { WebSocketServer, WebSocket } from "ws";
import { Room } from "./server/room.js";
import { STEP, MAX_PLAYERS, cleanInput, neutralInput } from "./shared/game.js";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

export function createGameServer() {
  const rooms = new Map();
  const stats = { steps: 0, maxStepMs: 0, droppedTicks: 0 };
  const server = http.createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'none'",
    );
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    if (pathname === "/health") {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(
        JSON.stringify({
          ok: true,
          rooms: rooms.size,
          players: [...rooms.values()].reduce(
            (n, r) => n + r.humans().length,
            0,
          ),
          ...stats,
        }),
      );
      return;
    }
    const relative =
      pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const base =
      relative === "index.html" || relative.startsWith("shared/")
        ? ROOT
        : path.join(ROOT, "public");
    const filename = path.resolve(base, relative);
    const allowed =
      filename === path.join(ROOT, "index.html") ||
      filename.startsWith(path.join(ROOT, "shared") + path.sep) ||
      filename.startsWith(path.join(ROOT, "public") + path.sep);
    if (!allowed || relative.includes("\0") || !MIME[path.extname(filename)]) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    try {
      const body = await readFile(filename);
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(filename)],
        "Cache-Control": "no-cache",
        "Content-Length": body.length,
      });
      res.end(req.method === "HEAD" ? undefined : body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 4096,
    perMessageDeflate: false,
  });
  server.on("upgrade", (req, socket, head) => {
    let valid = req.url === "/ws";
    if (req.headers.origin) {
      try {
        valid &&= new URL(req.headers.origin).host === req.headers.host;
      } catch {
        valid = false;
      }
    }
    if (!valid || wss.clients.size >= 256) {
      socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws));
  });
  function send(ws, data) {
    if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 128 * 1024)
      ws.send(JSON.stringify(data));
  }
  wss.on("connection", (ws) => {
    ws.alive = true;
    ws.joinedAt = Date.now();
    let room,
      entry,
      windowStart = Date.now(),
      messages = 0;
    ws.on("pong", () => {
      ws.alive = true;
    });
    ws.on("error", () => {});
    ws.on("message", (raw) => {
      const now = Date.now();
      if (now - windowStart > 1000) {
        windowStart = now;
        messages = 0;
      }
      if (++messages > 100) {
        ws.close(1008, "Too many messages");
        return;
      }
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        ws.close(1008, "Invalid JSON");
        return;
      }
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "ping") {
        send(ws, { type: "pong", stamp: msg.stamp });
        return;
      }
      if (msg.type === "join" && !entry) {
        const name =
          typeof msg.name === "string"
            ? msg.name
                .replace(/[^\p{L}\p{N} _-]/gu, "")
                .trim()
                .slice(0, 16)
            : "";
        const color = Number.isInteger(msg.color) ? Math.abs(msg.color) % 8 : 0;
        let code =
          typeof msg.room === "string" ? msg.room.trim().toUpperCase() : "";
        if (msg.mode === "create" || msg.mode === "practice") {
          do {
            code = randomBytes(3).toString("hex").toUpperCase();
          } while (rooms.has(code));
        }
        if (code && !/^[A-Z0-9]{4,12}$/.test(code)) {
          send(ws, { type: "error", message: "Niepoprawny kod pokoju." });
          return;
        }
        code ||= "LOBBY";
        room = rooms.get(code);
        if (!room) {
          if (msg.mode === "join" && code !== "LOBBY") {
            send(ws, {
              type: "error",
              message: "Ten pokój już nie istnieje. Utwórz nowy.",
            });
            return;
          }
          if (rooms.size >= 64) {
            send(ws, {
              type: "error",
              message: "Serwer jest pełny. Spróbuj za chwilę.",
            });
            return;
          }
          room = new Room(code, msg.mode === "practice");
          rooms.set(code, room);
        }
        entry =
          typeof msg.token === "string"
            ? room
                .humans()
                .find((e) => e.token === msg.token && e.disconnectedAt)
            : null;
        if (!entry && room.players.size >= MAX_PLAYERS) {
          send(ws, { type: "error", message: "Pokój jest pełny (8 graczy)." });
          return;
        }
        entry ||= room.addPlayer(name || "Królik", color);
        entry.socket = ws;
        entry.disconnectedAt = null;
        entry.player.connected = true;
        entry.queue = [];
        entry.input = neutralInput();
        entry.lastInput = now;
        entry.player.ack = entry.lastSeq;
        ws.joined = true;
        send(ws, {
          type: "welcome",
          id: entry.player.id,
          token: entry.token,
          room: code,
          practice: room.practice,
          state: room.snapshot(),
        });
        return;
      }
      if (!entry) return;
      if (
        msg.type === "input" &&
        Array.isArray(msg.commands) &&
        msg.commands.length <= 6
      ) {
        for (const candidate of msg.commands) {
          const input = cleanInput(candidate);
          if (
            !input ||
            input.seq <= entry.lastSeq ||
            input.seq > entry.lastSeq + 600
          )
            continue;
          entry.lastSeq = input.seq;
          entry.lastInput = now;
          entry.queue.push(input);
          if (entry.queue.length > 12) entry.queue.shift();
        }
      }
      if (msg.type === "release") {
        entry.queue = [];
        entry.input = neutralInput();
        entry.player.ack = entry.lastSeq;
      }
      if (msg.type === "leave") {
        room.players.delete(entry.player.id);
        entry = null;
        ws.close(1000, "Left room");
      }
    });
    ws.on("close", () => {
      if (entry && entry.socket === ws) {
        entry.socket = null;
        entry.disconnectedAt = Date.now();
        entry.player.connected = false;
        entry.queue = [];
        entry.input = neutralInput();
      }
    });
  });
  let previous = performance.now(),
    accumulator = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    accumulator += Math.min((now - previous) / 1000, 0.25);
    previous = now;
    let count = 0;
    while (accumulator >= STEP && count < 8) {
      const start = performance.now();
      for (const room of rooms.values()) {
        room.step();
        if (room.tick % 3 === 0) {
          const snapshot = room.snapshot();
          for (const entry of room.humans())
            if (entry.socket) send(entry.socket, snapshot);
          room.events = [];
        }
      }
      stats.maxStepMs = Math.max(stats.maxStepMs, performance.now() - start);
      stats.steps++;
      accumulator -= STEP;
      count++;
    }
    if (accumulator >= STEP) {
      stats.droppedTicks += Math.floor(accumulator / STEP);
      accumulator %= STEP;
    }
  }, 4);
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (
        !ws.alive ||
        (!ws.joined && Date.now() - ws.joinedAt > 10000) ||
        ws.bufferedAmount > 512 * 1024
      ) {
        ws.terminate();
        continue;
      }
      ws.alive = false;
      ws.ping();
    }
    for (const [code, room] of rooms) {
      if (room.humans().some((e) => e.socket)) room.emptySince = Date.now();
      else if (Date.now() - room.emptySince > 60000) rooms.delete(code);
    }
  }, 10000);
  async function close() {
    clearInterval(timer);
    clearInterval(heartbeat);
    for (const ws of wss.clients) ws.terminate();
    await new Promise((resolve) => wss.close(resolve));
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  }
  return { server, rooms, stats, close };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const game = createGameServer();
  const port = Number(process.env.PORT || 3000);
  game.server.listen(port, process.env.HOST || "0.0.0.0", () =>
    console.log(`Bunny the Killer → http://localhost:${port}`),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, async () => {
      await game.close();
      process.exit(0);
    });
}
