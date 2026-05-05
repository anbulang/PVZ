import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { ASSET_PATHS } from "../src/game/assets.js";
import { getAudioAssetPaths } from "../src/game/audio.js";

const url = process.argv[2] ?? "http://localhost:5173";
const actionsPath = process.argv[3] ?? "tests/browser-actions.json";
const actions = JSON.parse(fs.readFileSync(actionsPath, "utf8"));
const requiredAssets = [
  ASSET_PATHS.ui.mower[0],
  ASSET_PATHS.zombieWalk.basic[0],
  ASSET_PATHS.zombieEat.basic[0],
  ASSET_PATHS.zombieEat.cone[0],
  ASSET_PATHS.zombieEat.bucket[0],
  ASSET_PATHS.zombieEat.imp[0],
  ASSET_PATHS.zombieEat.runner[0],
  ...getAudioAssetPaths().music,
  ...Object.values(ASSET_PATHS.sfx).map((paths) => paths[0]),
];
const missingAssets = requiredAssets.filter((assetPath) => !fs.existsSync(path.resolve(assetPath)));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const consoleErrors = [];

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => {
  consoleErrors.push(error.message);
});

await page.goto(url, { waitUntil: "networkidle" });

for (const step of actions.steps) {
  if (step.buttons?.includes("left_mouse_button")) {
    await page.mouse.click(step.mouse_x, step.mouse_y);
  }
  if (step.command) {
    await page.evaluate((command) => window.__enqueueGameCommand?.(command), step.command);
  }
  const frames = step.frames ?? 1;
  const ms = step.advanceMs ?? frames * (1000 / 60);
  await page.evaluate((duration) => window.advanceTime?.(duration), ms);
  await page.waitForTimeout(20);
}

await page.waitForTimeout(500);
const stateText = await page.evaluate(() => window.render_game_to_text?.() ?? "{}");
const state = JSON.parse(stateText);
const audioDebug = await page.evaluate(() => window.__audioDebug?.() ?? null);
const screenshotPath = "test-results/local-versus-game.png";
await page.locator("#game").screenshot({ path: screenshotPath });
await browser.close();

console.log(JSON.stringify({
  screenshotPath,
  consoleErrors,
  missingAssets,
  audioDebug,
  state,
}, null, 2));

if (consoleErrors.length > 0) {
  process.exitCode = 1;
}
if (missingAssets.length > 0) {
  process.exitCode = 1;
}
if ((state.entities?.plants?.length ?? 0) < 1 || (state.entities?.zombies?.length ?? 0) < 1) {
  process.exitCode = 1;
}
if (actions.expect?.minWaveCount !== undefined && (state.director?.waveCount ?? 0) < actions.expect.minWaveCount) {
  process.exitCode = 1;
}
if (actions.expect?.minSun !== undefined && (state.resources?.sun ?? 0) < actions.expect.minSun) {
  process.exitCode = 1;
}
if (actions.expect?.anyEating && !state.entities?.zombies?.some((zombie) => zombie.eating)) {
  process.exitCode = 1;
}
if (actions.expect?.anyArmorDropped && !state.entities?.zombies?.some((zombie) => zombie.armorDropped)) {
  process.exitCode = 1;
}
if (actions.expect?.audioUnlocked !== undefined && state.audio?.audioUnlocked !== actions.expect.audioUnlocked) {
  process.exitCode = 1;
}
if (actions.expect?.musicActive !== undefined && state.audio?.musicActive !== actions.expect.musicActive) {
  process.exitCode = 1;
}
if ((state.audio?.missing?.length ?? 0) > 0) {
  process.exitCode = 1;
}
