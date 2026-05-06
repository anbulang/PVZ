import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ASSET_MANIFEST, ASSET_PATHS, zombieVisualFor } from "../src/game/assets.js";
import { getAudioAssetPaths } from "../src/game/audio.js";

function assertExists(assetPath) {
  assert.equal(fs.existsSync(path.resolve(assetPath)), true, `${assetPath} should exist`);
}

function countGifFrames(assetPath) {
  const buffer = fs.readFileSync(path.resolve(assetPath));
  let frames = 0;
  for (let index = 0; index < buffer.length - 2; index += 1) {
    if (buffer[index] === 0x21 && buffer[index + 1] === 0xf9 && buffer[index + 2] === 0x04) frames += 1;
  }
  return frames;
}

test("critical animation and audio assets map to files in assets", () => {
  [
    ASSET_PATHS.scene.day[0],
    ASSET_PATHS.ui.shop[0],
    ASSET_PATHS.ui.seedChooser[0],
    ASSET_PATHS.ui.sunCounter[0],
    ASSET_PATHS.ui.shovelSlot[0],
    ASSET_PATHS.ui.flagMeterEmpty[0],
    ASSET_PATHS.ui.flagMeterFull[0],
    ASSET_PATHS.ui.mower[0],
    ASSET_PATHS.plantIdle.repeater[0],
    ASSET_PATHS.plantIdle.twinSunflower[0],
    ASSET_PATHS.plantIdle.torchwood[0],
    ASSET_PATHS.plantIdle.potatoMine[0],
    ASSET_PATHS.plantArmed.potatoMine[0],
    ASSET_PATHS.plantIdle.jalapeno[0],
    ASSET_PATHS.zombieWalk.basic[0],
    ASSET_PATHS.zombieWalk.flag[0],
    ASSET_PATHS.zombieWalk.screen[0],
    ASSET_PATHS.zombieWalk.zamboni[0],
    ASSET_PATHS.zombieEat.basic[0],
    ASSET_PATHS.zombieEat.cone[0],
    ASSET_PATHS.zombieEat.screen[0],
    ASSET_PATHS.zombieEat.bucket[0],
    ASSET_PATHS.zombieEat.imp[0],
    ASSET_PATHS.zombieEat.runner[0],
    ASSET_PATHS.zombieDeath.basic[0],
    ASSET_PATHS.zombieDeath.imp[0],
    ASSET_PATHS.zombieDeath.runner[0],
    ...getAudioAssetPaths().music,
    ...Object.values(ASSET_PATHS.sfx).map((paths) => paths[0]),
  ].forEach(assertExists);
});

test("asset manifest exposes scene, ui, plant, zombie, and projectile states", () => {
  assert.equal(ASSET_MANIFEST.scene.day.paths[0], ASSET_PATHS.scene.day[0]);
  assert.equal(ASSET_MANIFEST.ui.seedChooser.paths[0], ASSET_PATHS.ui.seedChooser[0]);
  assert.equal(ASSET_MANIFEST.ui.flagMeter.empty.paths[0], ASSET_PATHS.ui.flagMeterEmpty[0]);
  assert.equal(ASSET_MANIFEST.plants.sunflower.idle.paths[0], ASSET_PATHS.plantIdle.sunflower[0]);
  assert.equal(ASSET_MANIFEST.plants.potatoMine.armed.paths[0], ASSET_PATHS.plantArmed.potatoMine[0]);
  assert.equal(ASSET_MANIFEST.zombies.basic.walk.paths[0], ASSET_PATHS.zombieWalk.basic[0]);
  assert.equal(ASSET_MANIFEST.zombies.basic.eat.paths[0], ASSET_PATHS.zombieEat.basic[0]);
  assert.equal(ASSET_MANIFEST.zombies.basic.death.paths[0], ASSET_PATHS.zombieDeath.basic[0]);
  assert.equal(ASSET_MANIFEST.projectiles.pea.fly.paths[0], ASSET_PATHS.projectiles.pea[0]);
});

test("zombie walk assets are animated gifs", () => {
  Object.values(ASSET_PATHS.zombieWalk).forEach((paths) => {
    assert.equal(countGifFrames(paths[0]) > 1, true, `${paths[0]} should contain multiple frames`);
  });
});

test("background music uses the selected ogg track", () => {
  assert.deepEqual(ASSET_PATHS.music.background, ["assets/音效/ZombiesOnYourLawn.ogg"]);
  assert.equal(getAudioAssetPaths().music.includes("assets/音效/ZombiesOnYourLawn.ogg"), true);
});

test("zombie visual state selects matching scenario gifs", () => {
  assert.equal(zombieVisualFor({ type: "basic", eating: false }).paths[0], "assets/图片/僵尸/普通僵尸走路.gif");
  assert.equal(zombieVisualFor({ type: "basic", eating: true }).paths[0], "assets/图片/僵尸/普通僵尸啃食.gif");
  assert.equal(zombieVisualFor({ type: "screen", eating: false, armorDropped: false }).paths[0], "assets/图片/僵尸/铁门僵尸.gif");
  assert.equal(zombieVisualFor({ type: "screen", eating: false, armorDropped: true }).paths[0], "assets/图片/僵尸/普通僵尸走路.gif");
  assert.equal(zombieVisualFor({ type: "screen", eating: true, armorDropped: true }).paths[0], "assets/图片/僵尸/铁门僵尸啃食.gif");
  assert.equal(zombieVisualFor({ type: "cone", eating: true, armorDropped: true }).paths[0], "assets/图片/僵尸/路障僵尸啃食.gif");
  assert.equal(zombieVisualFor({ type: "bucket", eating: true, armorDropped: true }).paths[0], "assets/图片/僵尸/铁桶僵尸啃食.gif");
});
