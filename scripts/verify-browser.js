import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { ASSET_PATHS } from "../src/game/assets.js";
import { getAudioAssetPaths } from "../src/game/audio.js";

const url = process.argv[2] ?? "http://localhost:5173";
const actionsPath = process.argv[3] ?? "tests/browser-actions.json";
const actions = JSON.parse(fs.readFileSync(actionsPath, "utf8"));
const requiredAssets = [
  ASSET_PATHS.scene.day[0],
  ASSET_PATHS.ui.shop[0],
  ASSET_PATHS.ui.seedChooser[0],
  ASSET_PATHS.ui.sunCounter[0],
  ASSET_PATHS.ui.shovelSlot[0],
  ASSET_PATHS.ui.flagMeterEmpty[0],
  ASSET_PATHS.ui.flagMeterFull[0],
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
    await page.evaluate((command) => {
      if (command.type === "collectFirstSun") {
        const sun = window.__gameState?.sunPickups?.find((pickup) => !command.kind || pickup.kind === command.kind);
        if (sun) window.__enqueueGameCommand?.({ type: "collectSun", id: sun.id });
        return;
      }
      if (command.type === "setResources") {
        if (command.sun !== undefined) window.__gameState.resources.plant.sun = command.sun;
        if (command.brain !== undefined) window.__gameState.resources.zombie.brain = command.brain;
        return;
      }
      window.__enqueueGameCommand?.(command);
    }, step.command);
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
let gifFrameDiff = null;
if (actions.expect?.gifFramePixelDiff) {
  gifFrameDiff = await measureGifFrameDiff(page, actions.expect.gifFramePixelDiff);
}
const screenshotPath = "test-results/local-versus-game.png";
await page.locator("#game").screenshot({ path: screenshotPath });
await browser.close();

console.log(JSON.stringify({
  screenshotPath,
  consoleErrors,
  missingAssets,
  audioDebug,
  gifFrameDiff,
  state,
}, null, 2));

if (consoleErrors.length > 0) {
  process.exitCode = 1;
}
if (missingAssets.length > 0) {
  process.exitCode = 1;
}
if (!actions.expect?.allowNoLiveEntities && ((state.entities?.plants?.length ?? 0) < 1 || (state.entities?.zombies?.length ?? 0) < 1)) {
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
if (actions.expect?.musicPathNotMatching && new RegExp(actions.expect.musicPathNotMatching, "i").test(state.audio?.musicPath ?? "")) {
  process.exitCode = 1;
}
if (actions.expect?.anyPlantSun && !state.entities?.sunPickups?.some((sun) => sun.amount > 0)) {
  process.exitCode = 1;
}
if (actions.expect?.anyCollectSunEffect && !state.entities?.effects?.some((effect) => effect.type === "collectSun" && effect.amount > 0)) {
  process.exitCode = 1;
}
if (actions.expect?.anyPositiveSunDelta && !state.entities?.effects?.some((effect) => effect.type === "sunDelta" && effect.amount > 0)) {
  process.exitCode = 1;
}
if (actions.expect?.anyNegativeSunDelta && !state.entities?.effects?.some((effect) => effect.type === "sunDelta" && effect.amount < 0)) {
  process.exitCode = 1;
}
if (actions.expect?.anyZombieVisualAssetIncludes) {
  const expected = actions.expect.anyZombieVisualAssetIncludes;
  if (!state.entities?.zombies?.some((zombie) => zombie.visualAsset?.includes(expected))) process.exitCode = 1;
}
if (actions.expect?.anyZombieAnimationSource) {
  const expected = actions.expect.anyZombieAnimationSource;
  if (!state.entities?.zombies?.some((zombie) => zombie.animationSource === expected)) process.exitCode = 1;
}
if (actions.expect?.anyPlantVisualAssetIncludes) {
  const expected = actions.expect.anyPlantVisualAssetIncludes;
  if (!state.entities?.plants?.some((plant) => plant.visualAsset?.includes(expected))) process.exitCode = 1;
}
if (actions.expect?.anyProjectileType) {
  const expected = actions.expect.anyProjectileType;
  if (!state.entities?.projectiles?.some((projectile) => projectile.type === expected)) process.exitCode = 1;
}
if (actions.expect?.anyEffectType) {
  const expected = actions.expect.anyEffectType;
  if (!state.entities?.effects?.some((effect) => effect.type === expected)) process.exitCode = 1;
}
if (actions.expect?.eatingZombieVisualAssetIncludes) {
  const expected = actions.expect.eatingZombieVisualAssetIncludes;
  if (!state.entities?.zombies?.some((zombie) => zombie.eating && zombie.visualAsset?.includes(expected))) process.exitCode = 1;
}
if (actions.expect?.sceneAssetIncludes && !state.visualAssets?.scene?.includes(actions.expect.sceneAssetIncludes)) {
  process.exitCode = 1;
}
if (actions.expect?.uiAssetIncludes) {
  const expected = actions.expect.uiAssetIncludes;
  const uiPaths = Object.values(state.visualAssets?.ui ?? {});
  if (!uiPaths.some((assetPath) => assetPath?.includes(expected))) process.exitCode = 1;
}
if (actions.expect?.anyZombieDeathAssetIncludes) {
  const expected = actions.expect.anyZombieDeathAssetIncludes;
  if (!state.entities?.effects?.some((effect) => effect.type === "zombieDeath" && effect.visualAsset?.includes(expected))) process.exitCode = 1;
}
if (actions.expect?.noDamageNumbers && state.entities?.effects?.some((effect) => effect.type === "damageNumber")) {
  process.exitCode = 1;
}
if (actions.expect?.gifFramePixelDiff && (gifFrameDiff?.changedPixels ?? 0) < (actions.expect.gifFramePixelDiff.minChangedPixels ?? 80)) {
  process.exitCode = 1;
}

async function measureGifFrameDiff(page, options) {
  const sampleRegion = async () => page.evaluate((opts) => {
    const canvas = document.querySelector("#game");
    const ctx = canvas.getContext("2d");
    const zombie = window.__gameState?.zombies?.find((candidate) => !opts.type || candidate.type === opts.type);
    if (!zombie) return null;
    window.__gameState.paused = true;
    if (window.__gifTestX === undefined) window.__gifTestX = zombie.x;
    zombie.x = window.__gifTestX;
    const width = opts.width ?? 96;
    const height = opts.height ?? 120;
    const x = Math.max(0, Math.round(zombie.x - width / 2));
    const y = Math.max(0, Math.round(160 + zombie.row * 86 + 43 - height / 2));
    const imageData = ctx.getImageData(x, y, width, height);
    return { x, y, width, height, data: Array.from(imageData.data) };
  }, options);

  await page.waitForTimeout(80);
  const before = await sampleRegion();
  await page.waitForTimeout(options.waitMs ?? 750);
  await page.evaluate(() => {
    const zombie = window.__gameState?.zombies?.[0];
    if (zombie && window.__gifTestX !== undefined) zombie.x = window.__gifTestX;
  });
  await page.waitForTimeout(80);
  const after = await sampleRegion();
  if (!before || !after) return { changedPixels: 0, reason: "missing zombie" };
  let changedPixels = 0;
  for (let index = 0; index < before.data.length; index += 4) {
    const delta = Math.abs(before.data[index] - after.data[index])
      + Math.abs(before.data[index + 1] - after.data[index + 1])
      + Math.abs(before.data[index + 2] - after.data[index + 2])
      + Math.abs(before.data[index + 3] - after.data[index + 3]);
    if (delta > 24) changedPixels += 1;
  }
  return { changedPixels, region: { x: before.x, y: before.y, width: before.width, height: before.height } };
}
