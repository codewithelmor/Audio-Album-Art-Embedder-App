// Drives the real Electron app (journey J1) and records it. Run: node record-app.mjs
// Prereq: C:\demo\sample-music holds the MP3 (no embedded art) and cover.png (see prepare-demo-folder.py).
import { _electron as electron } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { demo } from './pw-demo-helpers.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..', '..', '..', '..');
const appDir = resolve(root, 'app');
const outDir = resolve(here, '..', 'recordings', 'j1-app');
const demoFolder = String.raw`C:\demo\sample-music`;
const userData = String.raw`C:\demo\userdata`;
const durs = JSON.parse(readFileSync(resolve(here, '..', 'audio', 'durations.json'), 'utf8'));
const LEAD = 0.3, HOLD = 0.9;              // must match voiceLead in edit.json

rmSync(outDir, { recursive: true, force: true }); rmSync(userData, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true }); mkdirSync(userData, { recursive: true });
writeFileSync(resolve(userData, 'settings.json'), JSON.stringify({ folder: '' })); // clean first run, no personal Music path

const electronExe = resolve(appDir, 'node_modules', 'electron', 'dist', 'electron.exe');
const app = await electron.launch({
  executablePath: electronExe,
  args: [appDir, `--user-data-dir=${userData}`],
  cwd: appDir,
  recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
});
let ok = false;
try {
  const page = await app.firstWindow();
  await page.waitForSelector('#folderBtn');
  // Fixed 1280x720 window content at 105% zoom so text is readable at 1080p.
  await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    w.setContentSize(1280, 720); w.center(); w.webContents.setZoomFactor(1.05);
  });
  // The native folder dialog would show personal folders; answer it with the demo folder.
  // The app's own code (button -> IPC -> scan) still runs unchanged.
  await app.evaluate(({ dialog }, folder) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] });
  }, demoFolder);
  const d = demo(page, { afterClickMs: 700, moveMs: 700 });
  await d.installNow();
  await d.hold(1200);

  // s02: choose the folder
  d.scene('s02', durs.s02 + LEAD + HOLD);
  await d.hold(1500);
  await d.click('Click "Choose folder…"', page.locator('#folderBtn'),
    async () => { await page.locator('#listSection').waitFor({ state: 'visible', timeout: 15000 });
                  const t = await page.locator('#folder').textContent();
                  if (t !== demoFolder) throw new Error(`folder shows "${t}"`); });
  await d.run('List shows the MP3', async () => {}, async () => {
    const n = await page.locator('#files li').count(); if (n !== 1) throw new Error(`${n} files listed`);
    const name = await page.locator('#files .name').textContent(); if (!name.includes('Bye Bye')) throw new Error(name); });
  await d.endScene();

  // s03: cover auto-detected
  d.scene('s03', durs.s03 + LEAD + HOLD);
  await d.run('Cover preview visible and auto-detected', async () => {
    await d.moveTo(page.locator('#coverPreview')); await d.pause(1200);
  }, async () => {
    await page.locator('#coverPreview').waitFor({ state: 'visible', timeout: 5000 });
    const p = await page.locator('#coverPath').textContent(); if (!p.endsWith('cover.png')) throw new Error(`cover path ${p}`);
    const nat = await page.locator('#coverPreview').evaluate(i => i.naturalWidth); if (nat < 100) throw new Error('preview not loaded'); });
  await d.run('Pause on "Choose image…" (alternative)', async () => { await d.moveTo(page.locator('#imageBtn')); await d.pause(900); });
  await d.run('Embed button enabled', async () => {}, async () => {
    if (await page.locator('#embedBtn').isDisabled()) throw new Error('Embed disabled'); });
  await d.endScene();

  // s04: click Embed (click lands near the end of the narration)
  d.scene('s04', durs.s04 + LEAD + 0.2);
  const embed = page.locator('#embedBtn');
  await d.moveTo(embed);
  await d.pause(Math.max(300, (durs.s04 + LEAD - 1.1) * 1000));
  const t0 = Date.now();
  await d.run('Click "Embed cover art"', async () => { await embed.click(); },
    async () => { await page.locator('#summary').waitFor({ state: 'visible', timeout: 30000 }); });
  const embedMs = Date.now() - t0;
  await d.endScene();

  // s05: summary
  d.scene('s05', durs.s05 + LEAD + HOLD + 1);
  await d.run('Summary says 1 of 1 file(s) updated, row Done', async () => {}, async () => {
    const s = await page.locator('#summaryText').textContent(); if (s.trim() !== '1 of 1 file(s) updated.') throw new Error(s);
    const st = await page.locator('#files .state').textContent(); if (st !== 'Done') throw new Error(`row state ${st}`);
    const w = await page.locator('#overallText').textContent(); if (w !== 'Finished') throw new Error(w); });
  await d.endScene();
  await d.pause(500);
  d.saveMarkers(resolve(outDir, 'markers.json'));
  console.log(`EMBED_MS ${embedMs}`);
  console.log('JOURNEY PASS');
  ok = true;
} catch (e) {
  console.log(`JOURNEY FAIL ${e.message}`);
} finally {
  await app.close();
}
process.exit(ok ? 0 : 1);
