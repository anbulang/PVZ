import { ASSET_PATHS, drawAsset, zombieVisualFor } from "./assets.js";
import { CANVAS, GRID, PLANTS, PROJECTILES, SUN_PICKUP, ZOMBIES } from "./config.js";
import { getPlantCardRects, getZombieCardRects } from "./input.js";
import { cellCenterX, rowCenterY } from "./systems.js";

export function renderGame(ctx, state) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, width, height);
  drawHud(ctx, state);
  drawGrid(ctx);
  drawLaneMowers(ctx, state);
  drawDirectorWarning(ctx, state);
  drawPlants(ctx, state);
  drawSunPickups(ctx, state);
  drawProjectiles(ctx, state);
  drawZombies(ctx, state);
  drawEffects(ctx, state);
  drawStatus(ctx, state);
  if (state.paused || state.winner) drawOverlay(ctx, state);
}

function drawBackground(ctx, width, height) {
  if (drawAsset(ctx, ASSET_PATHS.scene.day, width / 2, height / 2, width, height)) {
    ctx.fillStyle = "rgba(255, 244, 168, 0.08)";
    ctx.fillRect(0, 0, width, height);
    return;
  }
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
  ctx.fillStyle = "#6b5036";
  ctx.fillRect(0, GRID.top - 34, 92, GRID.rows * GRID.cellHeight + 68);
  ctx.fillStyle = "#8d6f4a";
  ctx.fillRect(8, GRID.top - 24, 68, GRID.rows * GRID.cellHeight + 48);
  ctx.fillStyle = "#4e3a27";
  ctx.fillRect(72, GRID.top - 34, 14, GRID.rows * GRID.cellHeight + 68);
  ctx.fillStyle = "rgba(35,48,25,0.28)";
  ctx.fillRect(GRID.deployLeft + 132, GRID.top - 24, 82, GRID.rows * GRID.cellHeight + 48);
}

function drawHud(ctx, state) {
  if (!drawAsset(ctx, ASSET_PATHS.ui.shop, 292, 76, 552, 124)) {
    drawPanel(ctx, 16, 14, 552, 124, "#f7e8a6");
  }
  if (!drawAsset(ctx, ASSET_PATHS.ui.seedChooser, 988, 76, 552, 124)) {
    drawPanel(ctx, 712, 14, 552, 124, "#ded6c9");
  }
  ctx.fillStyle = "rgba(247, 232, 166, 0.78)";
  ctx.fillRect(712, 14, 552, 124);
  ctx.fillStyle = "#26391f";
  ctx.font = "700 22px system-ui";
  ctx.fillText(`脑力 ${Math.floor(state.resources.zombie.brain)}`, 730, 48);
  ctx.textAlign = "center";
  ctx.fillText(`${Math.ceil(state.timer.remaining)} 秒`, 640, 58);
  drawThreatMeter(ctx, state);
  ctx.textAlign = "left";
  for (const card of getPlantCardRects()) drawCard(ctx, state, card, "plant");
  for (const card of getZombieCardRects()) drawCard(ctx, state, card, "zombie");
  drawSunCounter(ctx, state);
}

function drawSunCounter(ctx, state) {
  const sun = Math.floor(state.resources.plant.sun);
  ctx.save();
  if (!drawAsset(ctx, ASSET_PATHS.ui.sunCounter, 106, 144, 156, 42)) {
    drawPanel(ctx, 30, 130, 156, 28, "#fff0a8");
  }
  if (!drawAsset(ctx, ASSET_PATHS.ui.sun, 48, 144, 30, 30)) {
    ctx.fillStyle = "#ffd54a";
    ctx.beginPath();
    ctx.arc(48, 144, 13, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#20351a";
  ctx.font = "900 22px system-ui";
  ctx.fillText(`阳光 ${sun}`, 68, 151);
  ctx.restore();
}

function drawCard(ctx, state, card, side) {
  const selected = state.selection?.side === side && state.selection?.type === card.id;
  const config = side === "plant" ? PLANTS[card.id] : ZOMBIES[card.id];
  const resource = side === "plant" ? state.resources.plant.sun : state.resources.zombie.brain;
  const affordable = card.id === "shovel" || resource >= config.cost;
  const compact = card.h < 80;
  if (card.id === "shovel") {
    if (!drawAsset(ctx, ASSET_PATHS.ui.shovelSlot, card.x + card.w / 2, card.y + card.h / 2, card.w + 12, card.h + 8)) {
      drawPanel(ctx, card.x, card.y, card.w, card.h, selected ? "#fff0a8" : affordable ? "#f9f2d0" : "#d2cbb0");
    }
  } else {
    drawPanel(ctx, card.x, card.y, card.w, card.h, selected ? "#fff0a8" : affordable ? "#f9f2d0" : "#d2cbb0");
  }
  ctx.save();
  ctx.translate(card.x + card.w / 2, card.y + (compact ? 24 : 45));
  if (compact) ctx.scale(0.52, 0.52);
  if (side === "plant" && card.id !== "shovel") drawPlantIcon(ctx, card.id, 0, 0, 0, null, true);
  if (side === "zombie") drawZombieIcon(ctx, card.id, 0, 0, 0, null, true);
  if (card.id === "shovel") drawShovelIcon(ctx, 0, 0, true);
  ctx.restore();
  ctx.fillStyle = "#26391f";
  ctx.font = compact ? "10px system-ui" : "12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(card.id === "shovel" ? "铲子" : config.name, card.x + card.w / 2, card.y + (compact ? 41 : 84));
  ctx.fillText(card.id === "shovel" ? "移除" : String(config.cost), card.x + card.w / 2, card.y + (compact ? 52 : 101));
  ctx.textAlign = "left";
  const cooldown = card.id === "shovel" ? 0 : state.cards[side][card.id].cooldownRemaining;
  if (cooldown > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(card.x, card.y, card.w, card.h * Math.min(1, cooldown / config.cooldown));
    ctx.fillStyle = "#fff7c2";
    ctx.font = compact ? "700 12px system-ui" : "700 18px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(cooldown.toFixed(1), card.x + card.w / 2, card.y + (compact ? 29 : 56));
    ctx.textAlign = "left";
  }
  if (!affordable) {
    ctx.fillStyle = "rgba(90,60,40,0.35)";
    ctx.fillRect(card.x, card.y, card.w, card.h);
  }
}

function drawThreatMeter(ctx, state) {
  const x = 578;
  const y = 74;
  const w = 124;
  const h = 20;
  const ratio = Math.max(0, Math.min(1, state.director.threat / 100));
  const drewMeter = drawAsset(ctx, ASSET_PATHS.ui.flagMeterEmpty, x + w / 2, y + h / 2, w, 34);
  if (drewMeter) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y - 6, w * ratio, 34);
    ctx.clip();
    drawAsset(ctx, ASSET_PATHS.ui.flagMeterFull, x + w / 2, y + h / 2, w, 34);
    ctx.restore();
    drawAsset(ctx, ASSET_PATHS.ui.flagMeterPart1, x + w * ratio, y + h / 2 - 2, 20, 24);
    ctx.fillStyle = "#26391f";
    ctx.font = "12px system-ui";
    ctx.fillText(`压力 ${Math.round(state.director.threat)}`, x + 38, y + 36);
    return;
  }
  ctx.fillStyle = "rgba(38,57,31,0.25)";
  ctx.fillRect(x, y, w, h);
  const gradient = ctx.createLinearGradient(x, y, x + w, y);
  gradient.addColorStop(0, "#85c64d");
  gradient.addColorStop(0.65, "#e6b94f");
  gradient.addColorStop(1, "#d45c3a");
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w * ratio, h);
  ctx.strokeStyle = "#26391f";
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#26391f";
  ctx.font = "12px system-ui";
  ctx.fillText(`压力 ${Math.round(state.director.threat)}`, x + 38, y + 32);
}

function drawGrid(ctx) {
  for (let row = 0; row < GRID.rows; row += 1) {
    for (let col = 0; col < GRID.cols; col += 1) {
      const x = GRID.left + col * GRID.cellWidth;
      const y = GRID.top + row * GRID.cellHeight;
      ctx.fillStyle = (row + col) % 2 === 0 ? "#8bc85a" : "#7cba4e";
      ctx.fillRect(x, y, GRID.cellWidth, GRID.cellHeight);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(x + 4, y + 5, GRID.cellWidth - 8, 12);
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

function drawLaneMowers(ctx, state) {
  for (const mower of state.laneMowers) {
    if (!mower.available && !mower.active) continue;
    const y = rowCenterY(mower.row) + 8;
    if (drawAsset(ctx, ASSET_PATHS.ui.mower, mower.x, y, 74, 58)) continue;
    ctx.save();
    ctx.translate(mower.x, y);
    ctx.fillStyle = mower.active ? "#e24a33" : "#d13b2f";
    ctx.fillRect(-24, -16, 48, 24);
    ctx.fillStyle = "#242424";
    ctx.beginPath();
    ctx.arc(-15, 12, 7, 0, Math.PI * 2);
    ctx.arc(17, 12, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#dadada";
    ctx.fillRect(5, -34, 8, 28);
    ctx.restore();
  }
}

function drawDirectorWarning(ctx, state) {
  const warning = state.director.warning;
  if (!warning) return;
  const y = GRID.top + warning.row * GRID.cellHeight;
  ctx.fillStyle = `rgba(216, 67, 42, ${0.18 + Math.sin(state.time * 10) * 0.08})`;
  ctx.fillRect(GRID.left, y, GRID.deployLeft - GRID.left + 132, GRID.cellHeight);
  const waveAsset = state.timer.remaining < 35 ? ASSET_PATHS.ui.finalWave : ASSET_PATHS.ui.largeWave;
  drawAsset(ctx, waveAsset, 640, GRID.top + GRID.rows * GRID.cellHeight + 12, 260, 72, { alpha: Math.min(1, warning.remaining / 1.5) });
  ctx.fillStyle = "#fff0a8";
  ctx.font = "800 18px system-ui";
  ctx.fillText(`第 ${warning.row + 1} 路预警 ${warning.remaining.toFixed(1)}s`, GRID.deployLeft - 190, y + 28);
}

function drawSunPickups(ctx, state) {
  for (const sun of state.sunPickups) {
    const pulse = 1 + Math.sin(state.time * 8 + sun.x) * 0.08;
    const drewSunAsset = drawAsset(ctx, ASSET_PATHS.ui.sun, sun.x, sun.y, 52 * pulse, 52 * pulse);
    if (!drewSunAsset) {
      ctx.save();
      ctx.translate(sun.x, sun.y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = "#ffd54a";
      for (let i = 0; i < 10; i += 1) {
        ctx.rotate(Math.PI / 5);
        ctx.fillRect(-3, -SUN_PICKUP.radius, 6, 14);
      }
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    drawFloatingValue(ctx, String(sun.amount), sun.x + 23, sun.y - 18, 1, "#fff6a6", "#6b4b12", 15);
  }
}

function drawPlants(ctx, state) {
  for (const plant of state.plants) {
    drawShadow(ctx, cellCenterX(plant.col), rowCenterY(plant.row) + 36, 54, 12);
    drawPlantIcon(ctx, plant.type, cellCenterX(plant.col), rowCenterY(plant.row), state.time, plant);
    if (plant.bitePulse > 0) drawBiteMarks(ctx, cellCenterX(plant.col), rowCenterY(plant.row), state.time);
    drawHealth(ctx, cellCenterX(plant.col) - 32, rowCenterY(plant.row) + 34, 64, plant.hp / plant.maxHp, "#3b8f2d");
  }
}

function drawZombies(ctx, state) {
  for (const zombie of [...state.zombies].sort((a, b) => a.x - b.x)) {
    drawShadow(ctx, zombie.x, rowCenterY(zombie.row) + 42, 48, 12);
    drawZombieIcon(ctx, zombie.type, zombie.x, rowCenterY(zombie.row), state.time, zombie);
    if (zombie.armorDropped) drawDroppedArmorAt(ctx, zombie.type, zombie.x - 34, rowCenterY(zombie.row) + 35, state.time);
    drawHealth(ctx, zombie.x - 32, rowCenterY(zombie.row) + 38, 64, zombie.hp / zombie.maxHp, "#8e2f2b");
  }
}

function drawProjectiles(ctx, state) {
  for (const projectile of state.projectiles) {
    const config = PROJECTILES[projectile.type];
    if (drawAsset(ctx, ASSET_PATHS.projectiles[projectile.type], projectile.x, projectile.y - 12, 28, 28)) continue;
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
    const x = effect.x ?? cellCenterX(effect.col);
    const y = effect.y ?? rowCenterY(effect.row);
    if (effect.type === "armorDrop") {
      drawArmorDrop(ctx, effect);
      continue;
    }
    if (effect.type === "explosion") {
      ctx.globalAlpha = Math.max(0, Math.min(1, effect.ttl / 0.75));
      const radius = 40 + (0.75 - effect.ttl) * 180;
      const gradient = ctx.createRadialGradient(x, y, 10, x, y, radius);
      gradient.addColorStop(0, "#fff5a3");
      gradient.addColorStop(0.35, "#ff9d37");
      gradient.addColorStop(1, "rgba(180,40,20,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }
    if (effect.type === "rowFire") {
      const alpha = Math.max(0.55, Math.min(1, effect.ttl / effect.maxTtl));
      ctx.globalAlpha = alpha;
      const rowY = rowCenterY(effect.row);
      ctx.fillStyle = "rgba(255, 98, 22, 0.38)";
      ctx.fillRect(GRID.left, rowY - 30, GRID.deployLeft - GRID.left + 132, 60);
      const gradient = ctx.createLinearGradient(GRID.left, rowY, GRID.deployLeft + 132, rowY);
      gradient.addColorStop(0, "rgba(255, 226, 84, 0)");
      gradient.addColorStop(0.2, "#ffde54");
      gradient.addColorStop(0.5, "#ff6a1a");
      gradient.addColorStop(0.8, "#ffde54");
      gradient.addColorStop(1, "rgba(255, 226, 84, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(GRID.left, rowY - 22, GRID.deployLeft - GRID.left + 132, 44);
      ctx.fillStyle = "rgba(255, 244, 126, 0.86)";
      for (let i = 0; i < 18; i += 1) {
        const flameX = GRID.left + i * 58 + ((effect.maxTtl - effect.ttl) * 90) % 42;
        ctx.beginPath();
        ctx.ellipse(flameX, rowY + Math.sin(i) * 6, 18, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      continue;
    }
    if (effect.type === "zombieDeath") {
      const progress = 1 - effect.ttl / effect.maxTtl;
      const size = effect.zombieType === "imp" ? [74, 82] : effect.zombieType === "runner" ? [112, 118] : [96, 118];
      const paths = ASSET_PATHS.zombieDeath[effect.zombieType] ?? ASSET_PATHS.zombieDeath.basic;
      if (!drawAsset(ctx, paths, x, y - 8, size[0], size[1], { alpha: Math.max(0, Math.min(1, effect.ttl / effect.maxTtl)) })) {
        drawFloatingValue(ctx, "击倒", x, y - progress * 22, ctx.globalAlpha, "#f5e6c8", "#5b1c1c", 22);
      }
      ctx.globalAlpha = 1;
      continue;
    }
    ctx.globalAlpha = Math.max(0, Math.min(1, effect.ttl));
    if (effect.type === "ignite") {
      const radius = 10 + (1 - effect.ttl / 0.22) * 18;
      ctx.fillStyle = `rgba(255, 122, 40, ${ctx.globalAlpha})`;
      ctx.beginPath();
      ctx.arc(x, y - 12, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }
    if (effect.type === "collectSun") {
      const progress = 1 - effect.ttl / effect.maxTtl;
      drawFloatingValue(ctx, `+${effect.amount}`, x, y - 24 - progress * 20, ctx.globalAlpha, "#fff1a8", "#4d3910", 24);
      ctx.globalAlpha = 1;
      continue;
    }
    if (effect.type === "sunDelta") {
      const progress = 1 - effect.ttl / effect.maxTtl;
      const positive = effect.amount > 0;
      const text = `${positive ? "+" : ""}${effect.amount}`;
      drawFloatingValue(ctx, text, x + progress * 18, y - progress * 26, ctx.globalAlpha, positive ? "#fff1a8" : "#ffb0a0", positive ? "#4d3910" : "#6a1f15", 24);
      ctx.globalAlpha = 1;
      continue;
    }
    ctx.fillStyle = effect.type === "sunPop" || effect.type === "collectSun" ? "#ffd64d" : effect.type === "mowerStart" ? "#ff5a3d" : "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y - 22, 18 + (1 - effect.ttl) * 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawStatus(ctx, state) {
  drawPanel(ctx, 180, 622, 920, 64, "#f7e8a6");
  ctx.fillStyle = "#26391f";
  ctx.font = "700 20px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(state.status, 640, 654);
  ctx.font = "13px system-ui";
  ctx.fillText("鼠标：选择卡牌并放置 / 点击阳光收集    P 暂停    R 重开    F 全屏", 640, 676);
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
  const bitePulse = plant?.bitePulse ?? 0;
  ctx.translate(x, y);
  if (plant?.bitePulse > 0) {
    ctx.translate(4, 0);
    ctx.scale(1 + bitePulse * 0.16, 1 - bitePulse * 0.1);
  } else if (plant) {
    const sway = Math.sin(time * 2.6 + plant.col * 0.7 + plant.row * 0.35);
    ctx.translate(sway * 1, 0);
    ctx.rotate(sway * 0.012);
  }
  if (plant?.flash > 0) ctx.globalAlpha = 0.55;
  const spriteSize = plantSpriteSize(type);
  const sized = type === "cherrybomb" ? [86, 78] : spriteSize;
  const paths = plant?.armed && ASSET_PATHS.plantArmed[type] ? ASSET_PATHS.plantArmed[type] : ASSET_PATHS.plantIdle[type];
  if (drawAsset(ctx, paths, 0, 0, sized[0], sized[1])) {
    ctx.restore();
    return;
  }
  if (type === "sunflower") drawSunflower(ctx);
  if (type === "peashooter") drawPeashooter(ctx, "#65b84d");
  if (type === "repeater") drawPeashooter(ctx, "#4ca43d");
  if (type === "wallnut") drawWallnut(ctx);
  if (type === "frostshooter") drawPeashooter(ctx, "#72c8d8");
  if (type === "twinSunflower") drawSunflower(ctx);
  if (type === "torchwood") drawTorchwood(ctx);
  if (type === "potatoMine") drawPotatoMine(ctx, Boolean(plant?.armed));
  if (type === "jalapeno") drawJalapeno(ctx);
  if (type === "cherrybomb") drawCherryBomb(ctx);
  ctx.restore();
}

function plantSpriteSize(type) {
  if (type === "wallnut") return [84, 96];
  if (type === "torchwood") return [82, 92];
  if (type === "potatoMine") return [76, 64];
  if (type === "jalapeno") return [88, 88];
  if (type === "twinSunflower") return [104, 94];
  return [94, 94];
}

function drawFloatingValue(ctx, text, x, y, alpha, fill, stroke, size) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `800 ${size}px system-ui`;
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawZombieIcon(ctx, type, x, y, time = 0, zombie = null) {
  ctx.save();
  ctx.translate(x, y);
  if (zombie?.flash > 0) ctx.globalAlpha = 0.55;
  const spriteSize = zombieSpriteSize(type);
  const visual = zombieVisualFor(zombie ?? { type, eating: false, armorDropped: false });
  if (drawAsset(ctx, visual.paths, 0, -8, spriteSize[0], spriteSize[1])) {
    ctx.restore();
    return;
  }
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

function zombieSpriteSize(type) {
  if (type === "runner") return [108, 118];
  if (type === "imp") return [68, 78];
  if (type === "zamboni") return [122, 96];
  if (type === "screen") return [96, 118];
  if (type === "flag") return [96, 118];
  return [88, 116];
}

function drawBiteMarks(ctx, x, y) {
  ctx.save();
  ctx.translate(x + 22, y - 8);
  ctx.fillStyle = "rgba(80, 35, 18, 0.65)";
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(0, i * 9 - 9, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255, 245, 190, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, -18);
  ctx.lineTo(8, 18);
  ctx.stroke();
  ctx.restore();
}

function drawDroppedArmorAt(ctx, type, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.25);
  if (type === "bucket") {
    ctx.fillStyle = "#aeb7bf";
    ctx.fillRect(-16, -9, 32, 18);
    ctx.strokeStyle = "#59646b";
    ctx.strokeRect(-16, -9, 32, 18);
  } else if (type === "screen") {
    ctx.fillStyle = "#aeb7bf";
    ctx.fillRect(-17, -22, 34, 44);
    ctx.strokeStyle = "#59646b";
    ctx.strokeRect(-17, -22, 34, 44);
  } else if (type === "runner") {
    ctx.fillStyle = "#cb352e";
    ctx.beginPath();
    ctx.ellipse(0, 0, 19, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#efefef";
    ctx.fillRect(-16, -3, 32, 5);
  } else {
    ctx.fillStyle = "#dd7b2a";
    ctx.beginPath();
    ctx.moveTo(-15, 10);
    ctx.lineTo(15, 10);
    ctx.lineTo(0, -20);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawArmorDrop(ctx, effect) {
  ctx.save();
  ctx.translate(effect.x, effect.y);
  ctx.rotate((1.1 - effect.ttl) * 5);
  const alpha = Math.max(0, Math.min(1, effect.ttl));
  const path = effect.hatType === "bucket"
    ? ASSET_PATHS.zombieFeedback.bucketHat
    : effect.hatType === "screen"
      ? ASSET_PATHS.zombieFeedback.screenDoor
    : effect.hatType === "runner"
      ? ASSET_PATHS.zombieFeedback.runnerHelmet
      : ASSET_PATHS.zombieFeedback.coneHat;
  if (!drawAsset(ctx, path, 0, 0, effect.hatType === "runner" ? 54 : 44, 42, { alpha })) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = effect.hatType === "bucket" || effect.hatType === "screen" ? "#a9b0b7" : effect.hatType === "runner" ? "#d6483b" : "#dd7b2a";
    ctx.beginPath();
    ctx.moveTo(-18, 12);
    ctx.lineTo(18, 12);
    ctx.lineTo(0, -22);
    ctx.closePath();
    ctx.fill();
  }
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

function drawTorchwood(ctx) {
  ctx.fillStyle = "#8b4a25";
  ctx.fillRect(-22, -30, 44, 58);
  ctx.fillStyle = "#ff8a2a";
  ctx.beginPath();
  ctx.arc(0, -34, 17, 0, Math.PI * 2);
  ctx.fill();
}

function drawPotatoMine(ctx, armed) {
  ctx.fillStyle = armed ? "#a86a35" : "#6d4b2c";
  ctx.beginPath();
  ctx.ellipse(0, armed ? 5 : 18, armed ? 25 : 20, armed ? 21 : 9, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!armed) return;
  ctx.fillStyle = "#2c2118";
  ctx.beginPath();
  ctx.arc(-7, 0, 3, 0, Math.PI * 2);
  ctx.arc(8, 0, 3, 0, Math.PI * 2);
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

function drawCherryBomb(ctx) {
  ctx.fillStyle = "#c93030";
  ctx.beginPath();
  ctx.arc(-13, 3, 20, 0, Math.PI * 2);
  ctx.arc(13, 3, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3f8e38";
  ctx.fillRect(-3, -29, 6, 18);
  ctx.fillStyle = "#241111";
  ctx.beginPath();
  ctx.arc(-19, -2, 3, 0, Math.PI * 2);
  ctx.arc(7, -2, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawJalapeno(ctx) {
  ctx.fillStyle = "#d93422";
  ctx.beginPath();
  ctx.ellipse(0, 6, 18, 38, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2d8a35";
  ctx.fillRect(-5, -36, 10, 18);
  ctx.fillStyle = "#fff4b8";
  ctx.beginPath();
  ctx.arc(-6, -4, 3, 0, Math.PI * 2);
  ctx.arc(7, -5, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawShovelIcon(ctx, x, y, compact = false) {
  if (drawAsset(ctx, ASSET_PATHS.ui.shovel, x, y, compact ? 48 : 64, compact ? 48 : 64)) return;
  drawShovel(ctx, x, y);
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

function drawShadow(ctx, x, y, w, h) {
  ctx.fillStyle = "rgba(20,35,16,0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHealth(ctx, x, y, w, ratio, color) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(x, y, w, 7);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), 7);
}
