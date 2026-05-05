import { GRID, PLANTS, PROJECTILES, ZOMBIES } from "./config.js";
import { getPlantCardRects, getZombieCardRects } from "./input.js";
import { cellCenterX, rowCenterY } from "./systems.js";

export function renderGame(ctx, state) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, width, height);
  drawHud(ctx, state);
  drawGrid(ctx);
  drawProjectiles(ctx, state);
  drawPlants(ctx, state);
  drawZombies(ctx, state);
  drawEffects(ctx, state);
  drawStatus(ctx, state);
  if (state.paused || state.winner) drawOverlay(ctx, state);
}

function drawBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#d7ef94");
  gradient.addColorStop(0.55, "#7fb64f");
  gradient.addColorStop(1, "#476b37");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  for (let i = 0; i < 12; i += 1) {
    ctx.beginPath();
    ctx.ellipse(70 + i * 118, 142 + Math.sin(i) * 16, 55, 12, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud(ctx, state) {
  drawPanel(ctx, 16, 16, 552, 120, "#f7e8a6");
  drawPanel(ctx, 712, 16, 552, 120, "#ded6c9");
  ctx.fillStyle = "#26391f";
  ctx.font = "700 22px system-ui";
  ctx.fillText(`阳光 ${Math.floor(state.resources.plant.sun)}`, 34, 48);
  ctx.fillText(`脑力 ${Math.floor(state.resources.zombie.brain)}`, 730, 48);
  ctx.textAlign = "center";
  ctx.fillText(`${Math.ceil(state.timer.remaining)} 秒`, 640, 58);
  ctx.textAlign = "left";
  for (const card of getPlantCardRects()) drawCard(ctx, state, card, "plant");
  for (const card of getZombieCardRects()) drawCard(ctx, state, card, "zombie");
}

function drawCard(ctx, state, card, side) {
  const selected = state.selection?.side === side && state.selection?.type === card.id;
  drawPanel(ctx, card.x, card.y, card.w, card.h, selected ? "#fff0a8" : "#f9f2d0");
  ctx.save();
  ctx.translate(card.x + card.w / 2, card.y + 45);
  if (side === "plant" && card.id !== "shovel") drawPlantIcon(ctx, card.id, 0, 0, 0);
  if (side === "zombie") drawZombieIcon(ctx, card.id, 0, 0, 0);
  if (card.id === "shovel") drawShovel(ctx, 0, 0);
  ctx.restore();
  const config = side === "plant" ? PLANTS[card.id] : ZOMBIES[card.id];
  ctx.fillStyle = "#26391f";
  ctx.font = "12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(card.id === "shovel" ? "铲子" : config.name, card.x + card.w / 2, card.y + 84);
  ctx.fillText(card.id === "shovel" ? "移除" : String(config.cost), card.x + card.w / 2, card.y + 101);
  ctx.textAlign = "left";
  const cooldown = card.id === "shovel" ? 0 : state.cards[side][card.id].cooldownRemaining;
  if (cooldown > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(card.x, card.y, card.w, card.h * Math.min(1, cooldown / config.cooldown));
  }
}

function drawGrid(ctx) {
  for (let row = 0; row < GRID.rows; row += 1) {
    for (let col = 0; col < GRID.cols; col += 1) {
      const x = GRID.left + col * GRID.cellWidth;
      const y = GRID.top + row * GRID.cellHeight;
      ctx.fillStyle = (row + col) % 2 === 0 ? "#8bc85a" : "#7cba4e";
      ctx.fillRect(x, y, GRID.cellWidth, GRID.cellHeight);
      ctx.strokeStyle = "rgba(42,74,32,0.3)";
      ctx.strokeRect(x, y, GRID.cellWidth, GRID.cellHeight);
    }
  }
  ctx.fillStyle = "rgba(85,73,64,0.65)";
  ctx.fillRect(GRID.deployLeft, GRID.top, 132, GRID.rows * GRID.cellHeight);
  ctx.fillStyle = "#fff7c2";
  ctx.font = "700 16px system-ui";
  ctx.fillText("僵尸投放区", GRID.deployLeft + 18, GRID.top - 12);
}

function drawPlants(ctx, state) {
  for (const plant of state.plants) {
    drawPlantIcon(ctx, plant.type, cellCenterX(plant.col), rowCenterY(plant.row), state.time, plant);
    drawHealth(ctx, cellCenterX(plant.col) - 32, rowCenterY(plant.row) + 34, 64, plant.hp / plant.maxHp, "#3b8f2d");
  }
}

function drawZombies(ctx, state) {
  for (const zombie of [...state.zombies].sort((a, b) => a.x - b.x)) {
    drawZombieIcon(ctx, zombie.type, zombie.x, rowCenterY(zombie.row), state.time, zombie);
    drawHealth(ctx, zombie.x - 32, rowCenterY(zombie.row) + 38, 64, zombie.hp / zombie.maxHp, "#8e2f2b");
  }
}

function drawProjectiles(ctx, state) {
  for (const projectile of state.projectiles) {
    const config = PROJECTILES[projectile.type];
    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y - 12, config.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(38,57,31,0.45)";
    ctx.stroke();
  }
}

function drawEffects(ctx, state) {
  for (const effect of state.effects) {
    ctx.globalAlpha = Math.max(0, Math.min(1, effect.ttl));
    ctx.fillStyle = effect.type === "sunPop" ? "#ffd64d" : "#ffffff";
    const x = effect.x ?? cellCenterX(effect.col);
    const y = effect.y ?? rowCenterY(effect.row);
    ctx.beginPath();
    ctx.arc(x, y - 22, 18 + (1 - effect.ttl) * 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawStatus(ctx, state) {
  drawPanel(ctx, 220, 628, 840, 58, "#f7e8a6");
  ctx.fillStyle = "#26391f";
  ctx.font = "700 20px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(state.status, 640, 665);
  ctx.textAlign = "left";
}

function drawOverlay(ctx, state) {
  ctx.fillStyle = "rgba(20, 30, 18, 0.52)";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "#fff5bd";
  ctx.font = "800 48px system-ui";
  ctx.textAlign = "center";
  const text = state.winner ? (state.winner === "plant" ? "植物方胜利" : "僵尸方胜利") : "暂停";
  ctx.fillText(text, 640, 335);
  ctx.font = "22px system-ui";
  ctx.fillText(state.winner ? "按 r 重新开始" : "按 p 继续", 640, 378);
  ctx.textAlign = "left";
}

function drawPlantIcon(ctx, type, x, y, time = 0, plant = null) {
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 4 + x) * 2);
  if (plant?.flash > 0) ctx.globalAlpha = 0.55;
  if (type === "sunflower") drawSunflower(ctx);
  if (type === "peashooter") drawPeashooter(ctx, "#65b84d");
  if (type === "wallnut") drawWallnut(ctx);
  if (type === "frostshooter") drawPeashooter(ctx, "#72c8d8");
  ctx.restore();
}

function drawZombieIcon(ctx, type, x, y, time = 0, zombie = null) {
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 6 + x) * 2);
  if (zombie?.flash > 0) ctx.globalAlpha = 0.55;
  ctx.fillStyle = type === "runner" ? "#7d9c72" : "#8f987e";
  ctx.fillRect(-18, -30, 36, 58);
  ctx.fillStyle = "#5e6a5a";
  ctx.beginPath();
  ctx.arc(0, -42, 23, 0, Math.PI * 2);
  ctx.fill();
  if (type === "cone") {
    ctx.fillStyle = "#db7e2b";
    ctx.beginPath();
    ctx.moveTo(-20, -58);
    ctx.lineTo(20, -58);
    ctx.lineTo(0, -94);
    ctx.closePath();
    ctx.fill();
  }
  if (type === "bucket") {
    ctx.fillStyle = "#9fa8b3";
    ctx.fillRect(-22, -70, 44, 22);
  }
  ctx.fillStyle = "#1f241f";
  ctx.beginPath();
  ctx.arc(-8, -45, 3, 0, Math.PI * 2);
  ctx.arc(8, -45, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSunflower(ctx) {
  ctx.fillStyle = "#ffd24b";
  for (let i = 0; i < 10; i += 1) {
    ctx.rotate(Math.PI / 5);
    ctx.beginPath();
    ctx.ellipse(0, -25, 9, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#8b5c33";
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
}

function drawPeashooter(ctx, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(-8, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(24, -2, 24, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1f3322";
  ctx.beginPath();
  ctx.arc(-15, -7, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawWallnut(ctx) {
  ctx.fillStyle = "#b8874b";
  ctx.beginPath();
  ctx.ellipse(0, 0, 31, 39, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6e4f31";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#2c2118";
  ctx.beginPath();
  ctx.arc(-9, -8, 3, 0, Math.PI * 2);
  ctx.arc(10, -8, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawShovel(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.5);
  ctx.fillStyle = "#826a4a";
  ctx.fillRect(-4, -30, 8, 54);
  ctx.fillStyle = "#b6c0c7";
  ctx.beginPath();
  ctx.ellipse(0, -38, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPanel(ctx, x, y, w, h, color) {
  ctx.fillStyle = "rgba(53, 68, 35, 0.25)";
  ctx.fillRect(x + 4, y + 4, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#5e6d36";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
}

function drawHealth(ctx, x, y, w, ratio, color) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(x, y, w, 7);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), 7);
}
