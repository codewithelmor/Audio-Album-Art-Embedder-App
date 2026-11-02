// Demo helpers for Playwright (web, Electron, Dynamics 365).
// Shows a visible cursor and click ring in recorded videos, moves the mouse
// smoothly, types at a readable speed, and checks every step.
// Usage: import { demo } from './pw-demo-helpers.mjs'; const d = demo(page);

const CURSOR_SCRIPT = () => {
  const install = () => {
    if (document.getElementById('__demo_cursor')) return;
    const c = document.createElement('div');
    c.id = '__demo_cursor';
    c.style.cssText = 'position:fixed;left:-50px;top:-50px;width:22px;height:22px;z-index:2147483647;pointer-events:none;' +
      'border-radius:50%;background:rgba(255,255,255,.85);border:2px solid rgba(20,20,20,.9);box-shadow:0 0 4px rgba(0,0,0,.5);' +
      'transform:translate(-50%,-50%);transition:width .1s,height .1s';
    document.documentElement.appendChild(c);
    document.addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    document.addEventListener('mousedown', e => {
      c.style.width = c.style.height = '16px';
      const r = document.createElement('div');
      r.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:16px;height:16px;border-radius:50%;` +
        'border:3px solid rgba(255,140,0,.9);transform:translate(-50%,-50%);pointer-events:none;z-index:2147483646;' +
        'transition:all .5s ease-out;opacity:1';
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.width = r.style.height = '56px'; r.style.opacity = '0'; });
      setTimeout(() => r.remove(), 600);
    }, true);
    document.addEventListener('mouseup', () => { c.style.width = c.style.height = '22px'; }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
};

// Scene markers: call demo(page) right after the page is created (video starts then),
// wrap each script scene in d.scene('s01', minSeconds) ... await d.endScene(),
// and call d.saveMarkers('markers.json'). minSeconds = voice-over length + hold,
// so the video always leaves room for the narration (see demo-voice-over).
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function demo(page, opts = {}) {
  const o = { moveMs: 550, afterClickMs: 800, typeDelayMs: 60, holdMs: 2000, timeoutMs: 10000, shotsDir: 'failures', ...opts };
  let step = 0;
  let pos = { x: 40, y: 40 };
  const t0 = Date.now();
  const scenes = [];
  let current = null;
  const pause = ms => page.waitForTimeout(ms); // viewer pacing only, never for sync

  async function moveTo(locator) {
    await locator.waitFor({ state: 'visible', timeout: o.timeoutMs });
    await locator.scrollIntoViewIfNeeded();
    const b = await locator.boundingBox();
    if (!b) throw new Error('Element has no bounding box');
    const target = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    const steps = Math.max(10, Math.round(o.moveMs / 16));
    await page.mouse.move(pos.x, pos.y);
    await page.mouse.move(target.x, target.y, { steps });
    pos = target;
  }

  async function run(name, action, check) {
    step += 1;
    const label = `Step ${step}: ${name}`;
    try {
      await action();
      if (check) await check();
      console.log(`PASS ${label}`);
    } catch (err) {
      console.log(`FAIL ${label} - ${err.message.split('\n')[0]}`);
      mkdirSync(o.shotsDir, { recursive: true });
      await page.screenshot({ path: `${o.shotsDir}/step-${step}.png` }).catch(() => {});
      throw err;
    }
  }

  return {
    /** Start a script scene. minSeconds = voice-over seconds + result hold. */
    scene(id, minSeconds = 0) {
      current = { id, start: (Date.now() - t0) / 1000, minSeconds };
      scenes.push(current);
      console.log(`SCENE ${id} at ${current.start.toFixed(2)}s`);
    },
    /** Hold until the scene is at least minSeconds long, then close it. */
    async endScene() {
      if (!current) return;
      const elapsed = (Date.now() - t0) / 1000 - current.start;
      if (elapsed < current.minSeconds) await pause(Math.round((current.minSeconds - elapsed) * 1000));
      current.end = (Date.now() - t0) / 1000;
      current = null;
    },
    saveMarkers(path) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify({ clock: 'seconds since page creation', scenes }, null, 2));
    },
    /** Call once before the first navigation. */
    async init() { await page.addInitScript(CURSOR_SCRIPT); },
    /** Re-install the cursor on a page that is already loaded (for example Electron's first window). */
    async installNow() { await page.evaluate(CURSOR_SCRIPT); },
    pause,
    hold: (ms = o.holdMs) => pause(ms),
    run,
    async click(name, locator, check) {
      await run(name, async () => { await moveTo(locator); await pause(150); await locator.click(); await pause(o.afterClickMs); }, check);
    },
    async type(name, locator, text, check) {
      await run(name, async () => {
        await moveTo(locator); await locator.click(); await locator.fill('');
        await locator.pressSequentially(text, { delay: o.typeDelayMs }); await pause(300);
      }, check ?? (async () => { const v = await locator.inputValue(); if (v !== text) throw new Error(`value is "${v}"`); }));
    },
    async select(name, locator, value, check) {
      await run(name, async () => { await moveTo(locator); await locator.selectOption(value); await pause(o.afterClickMs); }, check);
    },
    moveTo,
  };
}
