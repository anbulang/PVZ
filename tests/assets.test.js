import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ASSET_PATHS } from "../src/game/assets.js";
import { getAudioAssetPaths } from "../src/game/audio.js";

function assertExists(assetPath) {
  assert.equal(fs.existsSync(path.resolve(assetPath)), true, `${assetPath} should exist`);
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
