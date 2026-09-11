import { STEP, COLORS, FIRE_TICKS, neutralInput } from "/shared/game.js";
import { Network } from "./network.js";
import { Renderer } from "./renderer.js";
import { Audio } from "./audio.js";

const $ = (id) => document.getElementById(id);
const renderer = new Renderer($("arena")),
  sound = new Audio();
const keys = new Set(),
  touch = new Set();
const pointer = { x: innerWidth * 0.7, y: innerHeight * 0.5, down: false };
const coarse = matchMedia("(pointer:coarse)").matches;
let playing = false,
  connected = false,
  color = 0,
  lastHUD = 0,
  noticeTimer,
  showScores = false,
  frameCount = 0,
  fps = 60,
  fpsAt = performance.now();
let lastShot = 0,
  previousJump = false,
  hidden = false;
const net = new Network(updateHUD, onStatus, onEvent);
function savePreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
function preference(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
$("nickname").value = preference("btk:name", "Królik");
color = Number(preference("btk:color", "0")) % 8 || 0;
for (let i = 0; i < COLORS.length; i++) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "swatch";
  button.style.backgroundColor = COLORS[i];
  button.setAttribute(
    "aria-label",
    `Kolor ${["miętowy", "pomarańczowy", "fioletowy", "żółty", "niebieski", "różowy", "zielony", "biały"][i]}`,
  );
  button.setAttribute("aria-pressed", String(i === color));
  button.onclick = () => {
    color = i;
    savePreference("btk:color", i);
    for (const [j, el] of [...$("colors").children].entries())
      el.setAttribute("aria-pressed", String(j === i));
  };
  $("colors").append(button);
}
const roomFromLink = new URL(location.href).searchParams.get("room");
if (roomFromLink) {
  $("room-code").value = roomFromLink.toUpperCase();
  $("join-form").classList.add("invited");
}
function notice(message, persistent = false) {
  clearTimeout(noticeTimer);
  $("notice").textContent = message;
  $("notice").hidden = false;
  if (!persistent)
    noticeTimer = setTimeout(() => ($("notice").hidden = true), 3500);
}
function setBusy(value) {
  for (const el of document.querySelectorAll("#menu button"))
    el.disabled = value;
}
async function start(mode, room = "") {
  if (playing) return;
  $("menu-error").textContent = "";
  setBusy(true);
  try {
    await renderer.ready;
  } catch {
    $("menu-error").textContent =
      "Nie udało się wczytać grafiki. Odśwież stronę.";
    setBusy(false);
    return;
  }
  const name = $("nickname").value.trim() || "Królik";
  savePreference("btk:name", name);
  net.connect({ name, color, mode, room });
}
$("play-form").onsubmit = (e) => {
  e.preventDefault();
  start(roomFromLink ? "join" : "quick", roomFromLink || "");
};
$("create-room").onclick = () => start("create");
$("practice").onclick = () => start("practice");
$("join-form").onsubmit = (e) => {
  e.preventDefault();
  const code = $("room-code").value.trim();
  if (!code) {
    $("menu-error").textContent = "Wpisz kod pokoju od znajomego.";
    return;
  }
  start("join", code);
};
function onStatus(status, message) {
  const label = {
    connecting: "Łączenie…",
    connected: "Połączono",
    reconnecting: "Ponowne łączenie…",
    error: "Brak połączenia",
  }[status];
  $("connection").textContent = label;
  if (status === "connected") {
    playing = true;
    connected = true;
    setBusy(false);
    $("menu").hidden = true;
    $("hud").hidden = false;
    $("touch-controls").hidden = !coarse;
    document.body.classList.add("playing");
    $("notice").hidden = true;
    $("room-label").textContent = net.practice
      ? "TRENING"
      : net.room === "LOBBY"
        ? "OTWARTA ARENA"
        : `POKÓJ ${net.room}`;
    $("invite").hidden = net.practice;
    const url = new URL(location.href);
    if (net.room !== "LOBBY" && !net.practice)
      url.searchParams.set("room", net.room);
    else url.searchParams.delete("room");
    history.replaceState(null, "", url);
    notice(
      net.practice
        ? "Trening z 3 botami. Rozgrzej toster!"
        : `Do 10 fragów. ${net.room === "LOBBY" ? "Czekamy na przeciwników." : "Zaproś znajomych do pokoju."}`,
    );
  } else if (status === "reconnecting") {
    connected = false;
    resetInput();
    notice("Utracono połączenie. Próbuję wrócić do pokoju…", true);
  } else if (status === "error") {
    const wasPlaying = playing;
    leave();
    $("menu-error").textContent = message;
    setBusy(false);
    if (wasPlaying) notice(message);
  }
}
function onEvent(event) {
  renderer.event(event, net.id);
  if (event.type === "shot") {
    if (event.player !== net.id) sound.play("shot");
  }
  if (event.type === "hit" && event.owner === net.id && event.target)
    sound.play("hit", true);
  if (event.type === "kill") {
    sound.play("kill", event.player === net.id);
    const line = document.createElement("div");
    line.textContent = `${event.killer}  ▸  ${event.victim}`;
    $("kill-feed").prepend(line);
    while ($("kill-feed").children.length > 4)
      $("kill-feed").lastChild.remove();
    setTimeout(() => line.remove(), 5000);
  }
}
function updateHUD(state) {
  const now = performance.now();
  if (now - lastHUD < 90) return;
  lastHUD = now;
  const p = state.players.find((q) => q.id === net.id);
  if (!p) return;
  const remaining = Math.max(0, Math.ceil(state.remaining / 60));
  $("timer").textContent =
    `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  $("population").textContent =
    `${state.players.filter((q) => q.connected).length} / 8`;
  $("player-name").textContent = p.name;
  $("hp").textContent = p.hp;
  $("health").value = p.hp;
  $("score").textContent = `${p.kills} fragów · ${p.deaths} zgonów`;
  $("heat").style.transform = `scaleX(${1 - p.cooldown / FIRE_TICKS})`;
  if (state.intermission) {
    $("round-banner").hidden = false;
    $("round-banner").replaceChildren();
    const title = document.createElement("strong");
    title.textContent =
      state.winner === "Remis" ? "REMIS!" : `${state.winner} wygrywa!`;
    const next = document.createElement("span");
    next.textContent = `Nowa runda za ${Math.ceil(state.intermission / 60)} s`;
    $("round-banner").append(title, next);
  } else if (p.respawn) {
    $("round-banner").hidden = false;
    $("round-banner").replaceChildren();
    const title = document.createElement("strong");
    title.textContent = "ALE GRZANKA.";
    const next = document.createElement("span");
    next.textContent = `Wracasz za ${Math.ceil(p.respawn / 60)} s`;
    $("round-banner").append(title, next);
  } else $("round-banner").hidden = true;
  if (showScores) renderScores(state);
}
function renderScores(state) {
  $("scores").replaceChildren();
  for (const p of [...state.players].sort(
    (a, b) => b.kills - a.kills || a.deaths - b.deaths,
  )) {
    const row = document.createElement("tr");
    for (const value of [
      `${p.id === net.id ? "▸ " : ""}${p.name}${p.bot ? " · BOT" : ""}${p.connected ? "" : " · offline"}`,
      p.kills,
      p.deaths,
    ]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    row.firstChild.style.color = COLORS[p.color];
    $("scores").append(row);
  }
}
function resetInput() {
  keys.clear();
  touch.clear();
  pointer.down = false;
  previousJump = false;
  net.release();
}
function togglePause() {
  if (!playing) return;
  resetInput();
  if ($("pause").open) $("pause").close();
  else $("pause").showModal();
}
$("menu-button").onclick = togglePause;
$("resume").onclick = () => {
  $("pause").close();
};
$("pause").addEventListener("cancel", resetInput);
function leave() {
  resetInput();
  net.send({ type: "leave" });
  net.disconnect();
  playing = false;
  connected = false;
  $("menu").hidden = false;
  $("hud").hidden = true;
  $("touch-controls").hidden = true;
  $("round-banner").hidden = true;
  $("scoreboard").hidden = true;
  $("notice").hidden = true;
  $("pause").close();
  document.body.classList.remove("playing");
  $("kill-feed").replaceChildren();
  setBusy(false);
  showScores = false;
  $("connection").textContent = "Tostery gotowe";
}
$("leave").onclick = leave;
$("invite").onclick = async () => {
  const url = new URL(location.href);
  url.searchParams.set("room", net.room);
  try {
    await navigator.clipboard.writeText(url.href);
    notice("Zaproszenie skopiowane. Wyślij je znajomym.");
  } catch {
    notice(`Kod pokoju: ${net.room} · adres serwera: ${location.host}`, true);
  }
};
$("sound").onclick = async () => {
  try {
    if (sound.enabled) sound.enabled = false;
    else await sound.enable();
    savePreference("btk:sound", sound.enabled ? "on" : "off");
    $("sound").textContent = `Dźwięk: ${sound.enabled ? "wł." : "wył."}`;
    $("sound").setAttribute("aria-pressed", String(sound.enabled));
  } catch {
    notice("Przeglądarka nie pozwoliła włączyć dźwięku.");
  }
};
$("fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    notice("Pełny ekran jest niedostępny w tej przeglądarce.");
  }
};
const gameKeys = new Set([
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyS",
  "Space",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Tab",
  "KeyP",
]);
window.addEventListener("keydown", (e) => {
  if (!playing || e.target instanceof HTMLInputElement) return;
  if (e.code === "Escape") {
    e.preventDefault();
    togglePause();
    return;
  }
  if ($("pause").open) return;
  if (gameKeys.has(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === "Tab") {
    showScores = true;
    $("scoreboard").hidden = false;
    renderScores(net.state);
  }
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (e.code === "Tab") {
    showScores = false;
    $("scoreboard").hidden = true;
  }
});
window.addEventListener("blur", () => {
  resetInput();
  showScores = false;
  $("scoreboard").hidden = true;
});
document.addEventListener("visibilitychange", () => {
  hidden = document.hidden;
  resetInput();
});
$("arena").addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
});
$("arena").addEventListener("pointerdown", (e) => {
  if (playing && !$("pause").open && e.button === 0) {
    pointer.down = true;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    $("arena").setPointerCapture(e.pointerId);
  }
});
window.addEventListener("pointerup", () => (pointer.down = false));
window.addEventListener("pointercancel", resetInput);
$("arena").addEventListener("contextmenu", (e) => e.preventDefault());
for (const button of document.querySelectorAll("[data-key]")) {
  button.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    touch.add(button.dataset.key);
    button.setPointerCapture(e.pointerId);
  });
  const release = () => touch.delete(button.dataset.key);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}
function readInput() {
  if (!playing || !connected || $("pause").open || hidden)
    return neutralInput();
  const input = {
    left: keys.has("KeyA") || keys.has("ArrowLeft") || touch.has("left"),
    right: keys.has("KeyD") || keys.has("ArrowRight") || touch.has("right"),
    jump:
      keys.has("Space") ||
      keys.has("KeyW") ||
      keys.has("ArrowUp") ||
      touch.has("jump"),
    down: keys.has("KeyS") || keys.has("ArrowDown") || touch.has("down"),
    fire: pointer.down || keys.has("KeyP") || touch.has("fire"),
    aim: 0,
  };
  const p = net.local;
  if (!p) return input;
  const worldPointer = renderer.screenToWorld(pointer.x, pointer.y);
  input.aim = Math.atan2(worldPointer.y - p.y - 29, worldPointer.x - p.x - 17);
  if (coarse && touch.has("fire")) {
    const target = net.state.players
      .filter((q) => q.id !== p.id && !q.respawn && q.connected)
      .sort(
        (a, b) =>
          Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
      )[0];
    input.aim = target
      ? Math.atan2(target.y - p.y, target.x - p.x)
      : input.left
        ? Math.PI
        : 0;
  }
  return input;
}
let previous = performance.now(),
  accumulator = 0;
function frame(now) {
  const dt = Math.min((now - previous) / 1000, 0.1);
  previous = now;
  accumulator += dt;
  while (accumulator >= STEP) {
    if (playing) {
      const input = readInput();
      net.input(input);
      if (input.jump && !previousJump && net.local && !net.local.respawn)
        sound.play("jump", true);
      previousJump = input.jump;
      if (
        input.fire &&
        connected &&
        net.local &&
        !net.local.respawn &&
        !net.state.intermission &&
        now - lastShot >= (FIRE_TICKS * 1000) / 60
      ) {
        sound.play("shot", true);
        lastShot = now;
        const anim = renderer.animations.get(net.id);
        if (anim) anim.recoil = 1;
      }
    }
    accumulator -= STEP;
  }
  const state = playing ? net.renderState(now, dt) : renderer.demo(now / 1000);
  if (!hidden)
    renderer.draw(
      state,
      playing ? net.id : null,
      now / 1000,
      dt,
      !playing,
      coarse ? null : pointer,
    );
  frameCount++;
  if (now - fpsAt >= 1000) {
    fps = Math.round((frameCount * 1000) / (now - fpsAt));
    frameCount = 0;
    fpsAt = now;
    $("performance").textContent =
      `${fps} FPS${playing ? ` / ${net.rtt} ms` : " / 60 Hz"}`;
    if (playing) {
      net.ping();
      if (connected) $("connection").textContent = `${net.rtt} ms · ${fps} FPS`;
    }
  }
  requestAnimationFrame(frame);
}
renderer.ready
  .then(() => {
    $("connection").textContent = "Tostery gotowe";
  })
  .catch(() => {
    $("menu-error").textContent =
      "Nie udało się wczytać grafiki. Odśwież stronę.";
  });
requestAnimationFrame(frame);
// Read-only diagnostics for reproducible browser tests and profiling.
Object.defineProperty(window, "btkDebug", {
  value: () => ({
    playing,
    connected,
    id: net.id,
    room: net.room,
    local: net.local ? { ...net.local } : null,
    state: net.state ? structuredClone(net.state) : null,
    pending: net.pending.length,
    correction: { ...net.correction },
    rtt: net.rtt,
    fps,
    particles: renderer.particles.length,
  }),
});
