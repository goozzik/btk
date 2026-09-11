import { movePlayer } from "/shared/game.js";

export class Network {
  constructor(onState, onStatus, onEvent) {
    Object.assign(this, {
      onState,
      onStatus,
      onEvent,
      socket: null,
      id: null,
      state: null,
      local: null,
      pending: [],
      outgoing: [],
      snapshots: [],
      seq: 0,
      rtt: 0,
      correction: { x: 0, y: 0 },
      stopped: true,
      retries: 0,
      seen: new Set(),
    });
  }
  connect(options) {
    this.disconnect();
    this.options = { ...options };
    this.stopped = false;
    this.open();
  }
  open() {
    this.onStatus("connecting");
    const ws = new WebSocket(
      `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`,
    );
    this.socket = ws;
    ws.onopen = () =>
      ws.send(JSON.stringify({ type: "join", ...this.options }));
    ws.onmessage = (event) => {
      if (ws !== this.socket) return;
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === "welcome") {
        this.id = msg.id;
        this.room = msg.room;
        this.practice = msg.practice;
        this.options = {
          ...this.options,
          mode: "join",
          room: msg.room,
          token: msg.token,
        };
        this.pending = [];
        this.outgoing = [];
        this.snapshots = [];
        this.seen.clear();
        this.local = null;
        this.seq = Math.max(
          0,
          (msg.state.players.find((p) => p.id === this.id)?.ack ?? -1) + 1,
        );
        this.correction = { x: 0, y: 0 };
        this.retries = 0;
        this.receive(msg.state);
        this.onStatus("connected");
      } else if (msg.type === "state") this.receive(msg);
      else if (msg.type === "pong")
        this.rtt = Math.round(performance.now() - msg.stamp);
      else if (msg.type === "error") {
        this.stopped = true;
        this.onStatus("error", msg.message);
        ws.close();
      }
    };
    ws.onclose = () => {
      if (this.stopped || ws !== this.socket) return;
      this.pending = [];
      this.outgoing = [];
      this.onStatus("reconnecting");
      if (++this.retries > 8) {
        this.stopped = true;
        this.onStatus(
          "error",
          "Nie udało się połączyć z serwerem. Spróbuj ponownie.",
        );
        return;
      }
      this.retryTimer = setTimeout(
        () => this.open(),
        Math.min(500 * 2 ** (this.retries - 1), 4000),
      );
    };
    ws.onerror = () => {};
  }
  receive(state) {
    const now = performance.now();
    this.state = state;
    this.lastReceive = now;
    this.snapshots.push({ ...state, received: now });
    if (this.snapshots.length > 30) this.snapshots.shift();
    const authoritative = state.players.find((p) => p.id === this.id);
    if (authoritative) {
      const previous = this.local;
      const changedLife =
        previous &&
        (previous.life !== authoritative.life ||
          (previous.respawn !== 0 && !authoritative.respawn) ||
          (!previous.respawn && authoritative.respawn));
      this.pending = this.pending.filter(
        (input) => input.seq > authoritative.ack,
      );
      if (changedLife) {
        this.pending = [];
        this.outgoing = [];
      }
      this.local = { ...authoritative };
      if (!state.intermission)
        for (const input of this.pending) movePlayer(this.local, input);
      if (previous && !changedLife) {
        this.correction.x += previous.x - this.local.x;
        this.correction.y += previous.y - this.local.y;
        if (Math.hypot(this.correction.x, this.correction.y) > 160)
          this.correction = { x: 0, y: 0 };
      } else this.correction = { x: 0, y: 0 };
    }
    for (const event of state.events)
      if (!this.seen.has(event.id)) {
        this.seen.add(event.id);
        this.onEvent(event);
      }
    if (this.seen.size > 500) this.seen = new Set([...this.seen].slice(-200));
    this.onState(state);
  }
  input(input) {
    if (
      !this.local ||
      this.socket?.readyState !== WebSocket.OPEN ||
      this.socket.bufferedAmount > 16384 ||
      this.stopped
    )
      return;
    // Do not build an unbounded prediction queue if the connection stalls.
    if (
      performance.now() - this.lastReceive > 1000 ||
      this.pending.length >= 120
    )
      return;
    const command = { ...input, seq: this.seq++ };
    this.pending.push(command);
    this.outgoing.push(command);
    if (!this.state.intermission) movePlayer(this.local, command);
    if (this.outgoing.length >= 2) this.flush();
  }
  flush() {
    if (!this.outgoing.length || this.socket?.readyState !== WebSocket.OPEN)
      return;
    if (this.socket.bufferedAmount > 16384) {
      return;
    }
    this.socket.send(
      JSON.stringify({ type: "input", commands: this.outgoing.splice(0, 6) }),
    );
  }
  release() {
    this.outgoing = [];
    this.pending = [];
    this.send({ type: "release" });
  }
  send(data) {
    if (this.socket?.readyState === WebSocket.OPEN)
      this.socket.send(JSON.stringify(data));
  }
  ping() {
    this.send({ type: "ping", stamp: performance.now() });
  }
  renderState(now, dt) {
    if (!this.state) return null;
    const latest = this.snapshots.at(-1);
    const target = latest.time + Math.min(now - latest.received, 150) - 100;
    let a = this.snapshots[0],
      b = latest;
    for (let i = 1; i < this.snapshots.length; i++) {
      if (this.snapshots[i].time >= target) {
        a = this.snapshots[i - 1];
        b = this.snapshots[i];
        break;
      }
    }
    const t =
      a.time === b.time
        ? 1
        : Math.max(0, Math.min(1, (target - a.time) / (b.time - a.time)));
    const players = b.players.map((p) => {
      const old = a.players.find((q) => q.id === p.id);
      if (!old || old.life !== p.life || old.respawn || p.respawn)
        return { ...p };
      const angle = Math.atan2(
        Math.sin(p.aim - old.aim),
        Math.cos(p.aim - old.aim),
      );
      return {
        ...p,
        x: old.x + (p.x - old.x) * t,
        y: old.y + (p.y - old.y) * t,
        aim: old.aim + angle * t,
      };
    });
    const decay = Math.exp(-dt * 18);
    this.correction.x *= decay;
    this.correction.y *= decay;
    if (this.local) {
      const index = players.findIndex((p) => p.id === this.id);
      const rendered = {
        ...this.local,
        x: this.local.x + this.correction.x,
        y: this.local.y + this.correction.y,
      };
      if (index >= 0) players[index] = rendered;
      else players.push(rendered);
    }
    // Project authoritative projectiles only a short distance; never predict damage.
    const elapsed = Math.min(
      (now - latest.received) / 1000 + this.rtt / 2000,
      0.1,
    );
    const bullets = latest.bullets.map((p) => ({
      ...p,
      x: p.x + p.vx * elapsed,
      y: p.y + p.vy * elapsed,
    }));
    return { ...this.state, players, bullets };
  }
  disconnect() {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
    }
    this.socket = null;
    this.local = null;
    this.state = null;
    this.pending = [];
    this.outgoing = [];
  }
}
