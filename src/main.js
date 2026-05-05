import { enqueueCommand } from "./game/commands.js";
import { processAudioEvents, unlockAudio } from "./game/audio.js";
import { attachInput } from "./game/input.js";
import { renderGame } from "./game/render.js";
import { createGameState, serializeGameState } from "./game/state.js";
import { updateGame } from "./game/systems.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const srState = document.querySelector("#screen-reader-state");
const state = createGameState();
let accumulator = 0;
let lastTime = performance.now();
const fixedDt = 1 / 60;

attachInput(canvas, state);
canvas.addEventListener("pointerdown", unlockAudio);
window.addEventListener("keydown", unlockAudio);

function frame(now) {
  const elapsed = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  accumulator += elapsed;
  while (accumulator >= fixedDt) {
    updateGame(state, fixedDt);
    processAudioEvents(state.audioEvents);
    accumulator -= fixedDt;
  }
  renderGame(ctx, state);
  srState.textContent = state.status;
  requestAnimationFrame(frame);
}

window.__gameState = state;
window.__enqueueGameCommand = (command) => enqueueCommand(state, command);
window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i += 1) updateGame(state, fixedDt);
  processAudioEvents(state.audioEvents);
  renderGame(ctx, state);
};
window.render_game_to_text = () => serializeGameState(state);

renderGame(ctx, state);
requestAnimationFrame(frame);
