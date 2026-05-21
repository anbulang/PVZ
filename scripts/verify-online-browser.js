import { chromium } from "playwright";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:5173";
const browser = await chromium.launch();
const plantPage = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const zombiePage = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const consoleErrors = [];

for (const page of [plantPage, zombiePage]) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
}

await plantPage.goto(baseUrl, { waitUntil: "networkidle" });
await zombiePage.goto(baseUrl, { waitUntil: "networkidle" });

const hosted = await plantPage.evaluate(() => window.__onlineClient.hostRoom("plant"));
await zombiePage.evaluate((roomCode) => window.__onlineClient.joinRoom(roomCode, "zombie"), hosted.online.roomCode);

await plantPage.evaluate(() => {
  window.__onlineClient.dispatchCommand({ type: "placePlant", plantType: "peashooter", row: 2, col: 1 });
});
await zombiePage.evaluate(() => {
  window.__onlineClient.dispatchCommand({ type: "deployZombie", zombieType: "basic", row: 2 });
});

await plantPage.waitForFunction(() => {
  const state = JSON.parse(window.render_game_to_text());
  return state.entities.plants.length === 1 && state.entities.zombies.length === 1;
});
await zombiePage.waitForFunction(() => {
  const state = JSON.parse(window.render_game_to_text());
  return state.entities.plants.length === 1 && state.entities.zombies.length === 1;
});

const plantState = await plantPage.evaluate(() => JSON.parse(window.render_game_to_text()));
const zombieState = await zombiePage.evaluate(() => JSON.parse(window.render_game_to_text()));
const plantOnline = await plantPage.evaluate(() => window.__gameState.online);
const zombieOnline = await zombiePage.evaluate(() => window.__gameState.online);

await browser.close();

const result = {
  consoleErrors,
  roomCode: plantOnline.roomCode,
  plantOnline,
  zombieOnline,
  plantEntities: plantState.entities,
  zombieEntities: zombieState.entities,
};
console.log(JSON.stringify(result, null, 2));

if (consoleErrors.length > 0) process.exitCode = 1;
if (plantOnline.roomCode !== zombieOnline.roomCode) process.exitCode = 1;
if (plantOnline.side !== "plant" || zombieOnline.side !== "zombie") process.exitCode = 1;
if (plantState.entities.plants.length !== 1 || zombieState.entities.plants.length !== 1) process.exitCode = 1;
if (plantState.entities.zombies.length !== 1 || zombieState.entities.zombies.length !== 1) process.exitCode = 1;
