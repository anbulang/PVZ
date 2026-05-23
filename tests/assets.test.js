import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ASSET_MANIFEST, ASSET_PATHS, GENERATED_ASSET_PATHS, SPRITESHEET_MANIFEST, armorDropAssetFor, zombieVisualFor } from "../src/game/assets.js";
import * as audio from "../src/game/audio.js";
import { createGameState } from "../src/game/state.js";

function assertExists(assetPath) {
  assert.equal(fs.existsSync(path.resolve(assetPath)), true, `${assetPath} should exist`);
}

function readPngSize(assetPath) {
  const buffer = fs.readFileSync(path.resolve(assetPath));
  assert.equal(buffer.toString("ascii", 1, 4), "PNG", `${assetPath} should be a PNG`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

test("critical animation and audio assets map to files", () => {
  [
    ASSET_PATHS.scene.day[0],
    ASSET_PATHS.scene.houseLeft[0],
    ASSET_PATHS.ui.sun[0],
    ASSET_PATHS.ui.shop[0],
    ASSET_PATHS.ui.seedChooser[0],
    ASSET_PATHS.ui.sunCounter[0],
    ASSET_PATHS.ui.shovelSlot[0],
    ASSET_PATHS.ui.flagMeterEmpty[0],
    ASSET_PATHS.ui.flagMeterFull[0],
    ASSET_PATHS.ui.cardFrame[0],
    ASSET_PATHS.ui.cardSelected[0],
    ASSET_PATHS.ui.cardDisabled[0],
    ASSET_PATHS.ui.brainCounter[0],
    ASSET_PATHS.ui.timerPanel[0],
    ASSET_PATHS.ui.statusPanel[0],
    ASSET_PATHS.ui.mower[0],
    ASSET_PATHS.plantIdle.repeater[0],
    ASSET_PATHS.plantIdle.twinSunflower[0],
    ASSET_PATHS.plantIdle.torchwood[0],
    ASSET_PATHS.plantIdle.potatoMine[0],
    ASSET_PATHS.plantArmed.potatoMine[0],
    ASSET_PATHS.plantIdle.jalapeno[0],
    ASSET_PATHS.zombieWalk.basic[0],
    ASSET_PATHS.zombieWalk.imp[0],
    ASSET_PATHS.zombieWalk.flag[0],
    ASSET_PATHS.zombieWalk.cone[0],
    ASSET_PATHS.zombieWalk.screen[0],
    ASSET_PATHS.zombieWalk.bucket[0],
    ASSET_PATHS.zombieWalk.zamboni[0],
    ASSET_PATHS.zombieWalk.runner[0],
    ASSET_PATHS.zombieEat.basic[0],
    ASSET_PATHS.zombieEat.flag[0],
    ASSET_PATHS.zombieEat.cone[0],
    ASSET_PATHS.zombieEat.screen[0],
    ASSET_PATHS.zombieEat.bucket[0],
    ASSET_PATHS.zombieEat.imp[0],
    ASSET_PATHS.zombieEat.runner[0],
    ASSET_PATHS.zombieDeath.basic[0],
    ASSET_PATHS.zombieDeath.imp[0],
    ASSET_PATHS.zombieDeath.runner[0],
    GENERATED_ASSET_PATHS.fx.explosion,
    GENERATED_ASSET_PATHS.fx.rowFire,
    GENERATED_ASSET_PATHS.fx.hit,
    GENERATED_ASSET_PATHS.fx.armorCone,
    GENERATED_ASSET_PATHS.fx.armorBucket,
    GENERATED_ASSET_PATHS.fx.armorScreen,
    GENERATED_ASSET_PATHS.fx.armorRunner,
    ...audio.getAudioAssetPaths().music,
    ...Object.values(ASSET_PATHS.sfx).map((paths) => paths[0]),
  ].forEach(assertExists);
});

test("visual polish generated assets are present", () => {
  [
    GENERATED_ASSET_PATHS.ui.sun,
    GENERATED_ASSET_PATHS.ui.resourceBrain,
    GENERATED_ASSET_PATHS.scene.houseLeft,
    SPRITESHEET_MANIFEST.plants.repeater.idle.src,
    SPRITESHEET_MANIFEST.plants.repeater.attack.src,
    SPRITESHEET_MANIFEST.zombies.basic.death.src,
    SPRITESHEET_MANIFEST.zombies.imp.death.src,
    SPRITESHEET_MANIFEST.zombies.cone.death.src,
    SPRITESHEET_MANIFEST.zombies.bucket.death.src,
    SPRITESHEET_MANIFEST.zombies.runner.death.src,
  ].forEach(assertExists);
});

test("login and room flow generated images are present", () => {
  assert.equal(fs.existsSync("generated-assets/ui/login-hero.png"), true);
  assert.equal(fs.existsSync("generated-assets/ui/room-panel-hero.png"), true);
});

test("visual polish assets are first-choice manifest paths", () => {
  assert.equal(ASSET_PATHS.ui.sun[0], GENERATED_ASSET_PATHS.ui.sun);
  assert.equal(ASSET_PATHS.ui.brainCounter[0], GENERATED_ASSET_PATHS.ui.resourceBrain);
  assert.equal(ASSET_PATHS.scene.houseLeft[0], GENERATED_ASSET_PATHS.scene.houseLeft);
  assert.equal(ASSET_PATHS.plantIdle.repeater[0], SPRITESHEET_MANIFEST.plants.repeater.idle.src);
});

test("asset manifest exposes scene, ui, plant, zombie, and projectile states", () => {
  assert.equal(ASSET_MANIFEST.scene.day.paths[0], ASSET_PATHS.scene.day[0]);
  assert.equal(ASSET_MANIFEST.scene.houseLeft.paths[0], ASSET_PATHS.scene.houseLeft[0]);
  assert.equal(ASSET_MANIFEST.ui.seedChooser.paths[0], ASSET_PATHS.ui.seedChooser[0]);
  assert.equal(ASSET_MANIFEST.ui.flagMeter.empty.paths[0], ASSET_PATHS.ui.flagMeterEmpty[0]);
  assert.equal(ASSET_MANIFEST.plants.sunflower.idle.paths[0], ASSET_PATHS.plantIdle.sunflower[0]);
  assert.equal(ASSET_MANIFEST.plants.potatoMine.armed.paths[0], ASSET_PATHS.plantArmed.potatoMine[0]);
  assert.equal(ASSET_MANIFEST.zombies.basic.walk.paths[0], ASSET_PATHS.zombieWalk.basic[0]);
  assert.equal(ASSET_MANIFEST.zombies.basic.eat.paths[0], ASSET_PATHS.zombieEat.basic[0]);
  assert.equal(ASSET_MANIFEST.zombies.basic.death.paths[0], ASSET_PATHS.zombieDeath.basic[0]);
  assert.equal(ASSET_MANIFEST.zombies.basic.walk.sprite.src, SPRITESHEET_MANIFEST.zombies.basic.walk.src);
  assert.equal(ASSET_MANIFEST.projectiles.pea.fly.paths[0], ASSET_PATHS.projectiles.pea[0]);
});

test("generated spritesheet specs map to valid PNG strips", () => {
  const specs = [
    ...Object.values(SPRITESHEET_MANIFEST.plants).flatMap((states) => Object.values(states)),
    ...Object.values(SPRITESHEET_MANIFEST.zombies).flatMap((states) => Object.values(states)),
    ...Object.values(SPRITESHEET_MANIFEST.fx),
  ];
  specs.forEach((spec) => {
    assertExists(spec.src);
    const size = readPngSize(spec.src);
    assert.equal(size.width, spec.frameWidth * spec.frames, `${spec.src} width should match frames`);
    assert.equal(size.height, spec.frameHeight, `${spec.src} height should match frameHeight`);
    assert.equal(spec.frames > 1, true, `${spec.src} should contain multiple frames`);
    assert.equal(spec.fps > 0, true, `${spec.src} fps should be positive`);
    assert.equal(spec.anchor.x >= 0 && spec.anchor.x <= 1, true, `${spec.src} anchor x should be normalized`);
    assert.equal(spec.anchor.y >= 0 && spec.anchor.y <= 1, true, `${spec.src} anchor y should be normalized`);
  });
});

test("playable zombies with eating states map to generated walk and eat spritesheets", () => {
  ["basic", "imp", "flag", "cone", "screen", "bucket", "runner"].forEach((type) => {
    assertExists(SPRITESHEET_MANIFEST.zombies[type].walk.src);
    assertExists(SPRITESHEET_MANIFEST.zombies[type].eat.src);
    assert.equal(zombieVisualFor({ type, eating: false }).sprite.src, SPRITESHEET_MANIFEST.zombies[type].walk.src);
    assert.equal(zombieVisualFor({ type, eating: true }).sprite.src, SPRITESHEET_MANIFEST.zombies[type].eat.src);
  });
});

test("zombie death animations do not fall back to legacy gifs", () => {
  Object.entries(ASSET_PATHS.zombieDeath).forEach(([type, paths]) => {
    assert.deepEqual(paths, [SPRITESHEET_MANIFEST.zombies[type].death.src]);
    assert.match(paths[0], /^generated-assets\/sprites\/zombies\/.+-death\.png$/);
  });
});

test("zombie death sheets are built from Codex art helper, not generic transformed fade", () => {
  const script = fs.readFileSync(path.resolve("scripts/remaster-imagegen-assets.py"), "utf8");
  assert.match(script, /def death_frames_from_codex_art/);
  assert.equal(script.includes('sprites/zombies/{zombie}-death.png", transformed_frames'), false);
});

test("armored zombie armor drops use distinct generated pieces", () => {
  const armorAssets = {
    cone: GENERATED_ASSET_PATHS.fx.armorCone,
    bucket: GENERATED_ASSET_PATHS.fx.armorBucket,
    screen: GENERATED_ASSET_PATHS.fx.armorScreen,
    runner: GENERATED_ASSET_PATHS.fx.armorRunner,
  };
  Object.entries(armorAssets).forEach(([type, assetPath]) => {
    assert.equal(armorDropAssetFor(type), assetPath);
  });
  const buffers = Object.fromEntries(Object.entries(armorAssets).map(([type, assetPath]) => [type, fs.readFileSync(path.resolve(assetPath))]));
  const entries = Object.entries(buffers);
  for (let left = 0; left < entries.length; left += 1) {
    for (let right = left + 1; right < entries.length; right += 1) {
      const [leftType, leftBuffer] = entries[left];
      const [rightType, rightBuffer] = entries[right];
      assert.equal(leftBuffer.equals(rightBuffer), false, `${leftType} armor should not reuse ${rightType} armor art`);
    }
  }
});

test("music scenes use Crazy Dave for ready screens and Grasswalk for day lawn play", () => {
  const state = createGameState();
  assert.equal(typeof audio.musicSceneForState, "function");
  assert.equal(audio.musicSceneForState(state), "ready");
  assert.deepEqual(ASSET_PATHS.music.ready, ["assets/音效/MainMenuPvZ1.ogg"]);

  state.started = true;
  assert.equal(audio.musicSceneForState(state), "dayLawn");
  assert.deepEqual(ASSET_PATHS.music.dayLawn, ["assets/音效/GrasswalkPvZ1.ogg"]);

  const musicPaths = audio.getAudioAssetPaths().music;
  assert.equal(musicPaths.includes("assets/音效/MainMenuPvZ1.ogg"), true);
  assert.equal(musicPaths.includes("assets/音效/GrasswalkPvZ1.ogg"), true);
});

test("zombie visual state selects generated spritesheets and keeps legacy fallbacks", () => {
  assert.equal(zombieVisualFor({ type: "basic", eating: false }).sprite.src, "generated-assets/sprites/zombies/basic-walk.png");
  assert.equal(zombieVisualFor({ type: "basic", eating: true }).sprite.src, "generated-assets/sprites/zombies/basic-eat.png");
  assert.equal(zombieVisualFor({ type: "screen", eating: false, armorDropped: true }).sprite.src, "generated-assets/sprites/zombies/screen-walk.png");
  assert.equal(zombieVisualFor({ type: "screen", eating: true, armorDropped: true }).sprite.src, "generated-assets/sprites/zombies/screen-eat.png");
  assert.equal(zombieVisualFor({ type: "flag", eating: false }).paths.includes("assets/图片/僵尸/旗帜僵尸.gif"), true);
  assert.equal(zombieVisualFor({ type: "cone", eating: true, armorDropped: true }).paths.includes("assets/图片/僵尸/路障僵尸啃食.gif"), true);
  assert.equal(zombieVisualFor({ type: "bucket", eating: true, armorDropped: true }).paths.includes("assets/图片/僵尸/铁桶僵尸啃食.gif"), true);
  assert.equal(zombieVisualFor({ type: "zamboni", eating: true }).state, "drive");
  assert.equal(zombieVisualFor({ type: "zamboni", eating: true }).sprite.src, "generated-assets/sprites/zombies/zamboni-drive.png");
  assert.equal(zombieVisualFor({ type: "basic", eating: false }).animationSource, "spritesheet");
});
