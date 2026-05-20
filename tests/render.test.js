import test from "node:test";
import assert from "node:assert/strict";
import { CANVAS, GRID } from "../src/game/config.js";
import { createGameState } from "../src/game/state.js";
import { renderGame } from "../src/game/render.js";

class TestImage {
  addEventListener() {}
}

function createRecordingContext() {
  const calls = [];
  const target = {
    canvas: { width: CANVAS.width, height: CANVAS.height },
    calls,
  };
  const gradient = { addColorStop() {} };

  return new Proxy(target, {
    get(object, property) {
      if (property in object) return object[property];
      if (property === "createLinearGradient" || property === "createRadialGradient") return () => gradient;
      if (property === "measureText") return (text) => ({ width: String(text).length * 9 });
      return (...args) => {
        calls.push({ method: String(property), args });
      };
    },
    set(object, property, value) {
      object[property] = value;
      return true;
    },
  });
}

test("fallback background does not draw a second deploy zone frame", () => {
  globalThis.Image = TestImage;
  const state = createGameState();
  state.started = true;
  const ctx = createRecordingContext();

  renderGame(ctx, state);

  const strayDeployBackdrops = ctx.calls.filter(({ method, args }) => (
    method === "fillRect"
    && args[0] === GRID.deployLeft + GRID.deployWidth
    && args[1] === GRID.top - 24
    && args[2] > 0
  ));
  assert.equal(strayDeployBackdrops.length, 0);
});
