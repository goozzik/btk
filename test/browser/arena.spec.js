import { test, expect } from "@playwright/test";

test("menu, practice combat, input release, scoreboard and return to menu", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.error("Browser error:", e.message);
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "BUNNY THE KILLER." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Trening z botami" }).click();
  await expect(page.locator("#hud")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.btkDebug().state?.players.length))
    .toBe(4);
  const start = await page.evaluate(() => window.btkDebug().local.x);
  await page.keyboard.down("KeyD");
  await expect
    .poll(() => page.evaluate(() => window.btkDebug().local.x))
    .toBeGreaterThan(start + 60);
  await page.keyboard.up("KeyD");
  await page.keyboard.press("Space");
  await page.waitForTimeout(100);
  await page.mouse.move(900, 550);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();
  await page.keyboard.down("Tab");
  await expect(page.locator("#scoreboard")).toBeVisible();
  await expect(page.locator("#scores tr")).toHaveCount(4);
  await page.keyboard.up("Tab");
  await page.keyboard.down("KeyD");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.btkDebug().local.vx)).toBe(0);
  await page.screenshot({ path: "artifacts/practice-desktop.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Wyjdź do menu" }).click();
  await expect(page.locator("#menu")).toBeVisible();
  expect(errors).toEqual([]);
});
test("two browsers share movement, room invitation and resume after an outage", async ({
  browser,
}) => {
  const context = await browser.newContext(),
    a = await context.newPage(),
    b = await context.newPage();
  await a.addInitScript(() => {
    window.WebSocket = new Proxy(window.WebSocket, {
      construct(Target, args) {
        const ws = new Target(...args);
        window.__testSocket = ws;
        return ws;
      },
    });
  });
  await a.goto("/");
  await a.locator("#nickname").fill("Alicja");
  await a.getByRole("button", { name: "Graj ze znajomymi" }).click();
  await expect
    .poll(() => a.evaluate(() => window.btkDebug().connected))
    .toBe(true);
  const { room, id } = await a.evaluate(() => window.btkDebug());
  await b.goto(`/?room=${room}`);
  await b.locator("#nickname").fill("Bartek");
  await b.getByRole("button", { name: /WSKAKUJ/ }).click();
  await expect
    .poll(() => b.evaluate(() => window.btkDebug().state?.players.length))
    .toBe(2);
  const startX = await a.evaluate(() => window.btkDebug().local.x);
  await a.keyboard.down("KeyD");
  await expect
    .poll(() =>
      b.evaluate(
        (id) => window.btkDebug().state.players.find((p) => p.id === id)?.x,
        id,
      ),
    )
    .toBeGreaterThan(startX + 60);
  await a.keyboard.up("KeyD");
  await a.waitForTimeout(350);
  const local = await a.evaluate(() =>
    window.btkDebug().state.players.find((p) => p.id === window.btkDebug().id),
  );
  const remote = await b.evaluate(
    (id) => window.btkDebug().state.players.find((p) => p.id === id),
    id,
  );
  expect(Math.abs(local.x - remote.x)).toBeLessThan(10);
  await a.evaluate(() => window.__testSocket.close());
  await expect
    .poll(() => a.evaluate(() => window.btkDebug().connected))
    .toBe(false);
  await expect
    .poll(() => a.evaluate(() => window.btkDebug().connected), {
      timeout: 15000,
    })
    .toBe(true);
  expect(await a.evaluate(() => window.btkDebug().room)).toBe(room);
  expect(await a.evaluate(() => window.btkDebug().id)).toBe(id);
  await context.close();
});
test("150 ms round trip preserves responsive movement and bounded reconciliation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWebSocket = window.WebSocket;
    window.WebSocket = class DelayedWebSocket extends NativeWebSocket {
      constructor(...args) {
        super(...args);
        super.addEventListener("message", (event) =>
          setTimeout(() => this.handler?.(event), 75),
        );
      }
      set onmessage(handler) {
        this.handler = handler;
      }
      get onmessage() {
        return this.handler;
      }
      send(data) {
        setTimeout(() => {
          if (this.readyState === NativeWebSocket.OPEN) super.send(data);
        }, 75);
      }
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Graj ze znajomymi" }).click();
  await expect
    .poll(() => page.evaluate(() => window.btkDebug().connected))
    .toBe(true);
  await page.waitForTimeout(600);
  const before = await page.evaluate(() => window.btkDebug().local.x);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(90);
  expect(await page.evaluate(() => window.btkDebug().local.x)).toBeGreaterThan(
    before + 2,
  );
  const samples = [];
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(100);
    samples.push(
      await page.evaluate(() => {
        const d = window.btkDebug();
        return {
          pending: d.pending,
          error: Math.hypot(d.correction.x, d.correction.y),
          fps: d.fps,
          rtt: d.rtt,
        };
      }),
    );
  }
  await page.keyboard.up("KeyD");
  await page.waitForTimeout(650);
  const result = await page.evaluate(() => window.btkDebug());
  const server = result.state.players.find((p) => p.id === result.id);
  expect(Math.abs(result.local.x - server.x)).toBeLessThan(3);
  expect(Math.max(...samples.map((s) => s.pending))).toBeLessThan(30);
  expect(Math.max(...samples.map((s) => s.error))).toBeLessThan(60);
  expect(samples.at(-1).rtt).toBeGreaterThan(140);
  console.log(
    "150 ms RTT samples:",
    JSON.stringify({
      maxPending: Math.max(...samples.map((s) => s.pending)),
      maxCorrection: +Math.max(...samples.map((s) => s.error)).toFixed(1),
      finalFPS: samples.at(-1).fps,
      measuredRTT: samples.at(-1).rtt,
    }),
  );
});
test("touch layout has usable controls and no horizontal overflow", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({ path: "artifacts/menu-mobile.png" });
  await page.getByRole("button", { name: "Trening z botami" }).click();
  await expect(page.locator("#touch-controls")).toBeVisible();
  await page.screenshot({ path: "artifacts/practice-mobile.png" });
  await context.close();
});
