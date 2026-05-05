import { chromium } from "playwright";
import fs from "node:fs";

const url = process.argv[2] ?? "http://localhost:5173";
const actionsPath = process.argv[3] ?? "tests/browser-actions.json";
const actions = JSON.parse(fs.readFileSync(actionsPath, "utf8"));
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
  const frames = step.frames ?? 1;
  await page.evaluate((ms) => window.advanceTime?.(ms), frames * (1000 / 60));
  await page.waitForTimeout(20);
}

await page.waitForTimeout(500);
const stateText = await page.evaluate(() => window.render_game_to_text?.() ?? "{}");
const state = JSON.parse(stateText);
const screenshotPath = "test-results/local-versus-game.png";
await page.locator("#game").screenshot({ path: screenshotPath });
await browser.close();

console.log(JSON.stringify({
  screenshotPath,
  consoleErrors,
  state,
}, null, 2));

if (consoleErrors.length > 0) {
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
