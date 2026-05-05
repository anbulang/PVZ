import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ASSET_PATHS } from "../src/game/assets.js";
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
    ASSET_PATHS.ui.mower[0],
    ASSET_PATHS.zombieWalk.basic[0],
    ASSET_PATHS.zombieEat.basic[0],
    ASSET_PATHS.zombieEat.cone[0],
    ASSET_PATHS.zombieEat.bucket[0],
    ASSET_PATHS.zombieEat.imp[0],
    ASSET_PATHS.zombieEat.runner[0],
    ...getAudioAssetPaths().music,
    ...Object.values(ASSET_PATHS.sfx).map((paths) => paths[0]),
  ].forEach(assertExists);
});

test("zombie walk assets are animated gifs", () => {
  Object.values(ASSET_PATHS.zombieWalk).forEach((paths) => {
    assert.equal(countGifFrames(paths[0]) > 1, true, `${paths[0]} should contain multiple frames`);
  });
});

test("background music avoids vocal tracks", () => {
  assert.deepEqual(ASSET_PATHS.music.background, ["assets/音效/rain.ogg", "assets/音效/phonograph.ogg"]);
  assert.equal(getAudioAssetPaths().music.some((assetPath) => /ZombiesOnYourLawn|sukhbir/i.test(assetPath)), false);
});
