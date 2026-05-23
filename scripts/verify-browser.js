import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { ASSET_PATHS } from "../src/game/assets.js";
import { getAudioAssetPaths } from "../src/game/audio.js";
import { GRID } from "../src/game/config.js";

const url = process.argv[2] ?? "http://localhost:5173";
const actionsPath = process.argv[3] ?? "tests/browser-actions.json";
const actions = JSON.parse(fs.readFileSync(actionsPath, "utf8"));
const requiredAssets = [
  ASSET_PATHS.scene.day[0],
  ASSET_PATHS.scene.houseLeft[0],
  ASSET_PATHS.ui.sun[0],
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
const viewport = actions.viewport ?? { width: 1280, height: 720 };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport });
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
    await clickCanvasLogical(page, step.mouse_x, step.mouse_y);
  }
  if (step.key) {
    await page.keyboard.press(step.key);
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
let deployOuterFrameDelta = null;
if (actions.expect?.deployOuterFrameMaxAverageDelta !== undefined) {
  deployOuterFrameDelta = await measureDeployOuterFrameDelta(page);
}
const screenshotPath = path.join("test-results", actions.screenshotName ?? "local-versus-game.png");
fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
await page.locator("#game").screenshot({ path: screenshotPath });
await browser.close();

console.log(JSON.stringify({
  screenshotPath,
  consoleErrors,
  missingAssets,
  audioDebug,
  gifFrameDiff,
  deployOuterFrameDelta,
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
if (actions.expect?.maxWaveCount !== undefined && (state.director?.waveCount ?? 0) > actions.expect.maxWaveCount) {
  process.exitCode = 1;
}
if (actions.expect?.directorAutoWaves !== undefined && state.director?.autoWaves !== actions.expect.directorAutoWaves) {
  process.exitCode = 1;
}
if (actions.expect?.minManualDeployCount !== undefined && (state.director?.manualDeployCount ?? 0) < actions.expect.minManualDeployCount) {
  process.exitCode = 1;
}
if (actions.expect?.minSun !== undefined && (state.resources?.sun ?? 0) < actions.expect.minSun) {
  process.exitCode = 1;
}
if (actions.expect?.minBrain !== undefined && (state.resources?.brain ?? 0) < actions.expect.minBrain) {
  process.exitCode = 1;
}
if (actions.expect?.timeRemainingMax !== undefined && (state.timeRemaining ?? Infinity) > actions.expect.timeRemainingMax) {
  process.exitCode = 1;
}
if (actions.expect?.winConditionPlantIncludes && !state.winCondition?.plant?.includes(actions.expect.winConditionPlantIncludes)) {
  process.exitCode = 1;
}
if (actions.expect?.minZombieComboCount !== undefined && (state.resources?.zombieCombo?.count ?? 0) < actions.expect.minZombieComboCount) {
  process.exitCode = 1;
}
if (actions.expect?.anyEating && !state.entities?.zombies?.some((zombie) => zombie.eating)) {
  process.exitCode = 1;
}
if (actions.expect?.selectionNull && state.selection !== null) {
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
if (actions.expect?.musicScene !== undefined && state.audio?.musicScene !== actions.expect.musicScene) {
  process.exitCode = 1;
}
if (actions.expect?.musicPathIncludes && !state.audio?.musicPath?.includes(actions.expect.musicPathIncludes)) {
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
if (actions.expect?.noPositiveSunDelta && state.entities?.effects?.some((effect) => effect.type === "sunDelta" && effect.amount > 0)) {
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
if (
  actions.expect?.deployOuterFrameMaxAverageDelta !== undefined
  && (deployOuterFrameDelta?.averageDelta ?? Number.POSITIVE_INFINITY) > actions.expect.deployOuterFrameMaxAverageDelta
) {
  process.exitCode = 1;
}

async function clickCanvasLogical(page, x, y) {
  const canvas = page.locator("#game");
  const box = await canvas.boundingBox();
  const size = await canvas.evaluate((element) => ({ width: element.width, height: element.height }));
  if (!box) throw new Error("#game canvas not found");
  await page.mouse.click(box.x + (x * box.width) / size.width, box.y + (y * box.height) / size.height);
}

async function measureGifFrameDiff(page, options) {
  const sampleRegion = async () => page.evaluate((opts) => {
    const canvas = document.querySelector("#game");
    const ctx = canvas.getContext("2d");
    const zombie = window.__gameState?.zombies?.find((candidate) => !opts.type || candidate.type === opts.type);
    if (!zombie) return null;
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
  await page.evaluate((duration) => {
    const state = window.__gameState;
    if (!state) return;
    const wasPaused = state.paused;
    state.paused = false;
    window.advanceTime?.(duration);
    state.paused = wasPaused;
    const zombie = window.__gameState?.zombies?.[0];
    if (zombie && window.__gifTestX !== undefined) zombie.x = window.__gifTestX;
  }, options.waitMs ?? 750);
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

async function measureDeployOuterFrameDelta(page) {
  return page.evaluate((grid) => {
    const canvas = document.querySelector("#game");
    const ctx = canvas.getContext("2d");
    const startX = Math.round(grid.deployLeft + grid.deployWidth + 10);
    const endX = Math.round(Math.min(canvas.width - 48, startX + 32));
    const sampleX = Math.round(Math.min(canvas.width - 18, grid.deployLeft + grid.deployWidth + 70));
    const startY = Math.round(grid.top + 20);
    const endY = Math.round(grid.top + grid.rows * grid.cellHeight - 20);
    let totalDelta = 0;
    let samples = 0;
    for (let y = startY; y <= endY; y += 12) {
      const reference = ctx.getImageData(sampleX, y, 1, 1).data;
      for (let x = startX; x <= endX; x += 8) {
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        totalDelta += Math.abs(pixel[0] - reference[0]) + Math.abs(pixel[1] - reference[1]) + Math.abs(pixel[2] - reference[2]);
        samples += 1;
      }
    }
    return {
      averageDelta: samples === 0 ? 0 : totalDelta / samples,
      region: { x: startX, y: startY, width: endX - startX, height: endY - startY },
      referenceX: sampleX,
    };
  }, GRID);
}
