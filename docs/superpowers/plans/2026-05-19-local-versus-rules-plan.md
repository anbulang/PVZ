# PVZ Local Versus Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove automatic zombie waves and make zombie pressure come from player-controlled local-versus deployment.

**Architecture:** Keep simulation state in `state.js`/`systems.js`, command mutations in `commands.js`, and rendering unchanged except for existing serialized director fields. The director object becomes a pressure/debug model instead of an automatic spawner.

**Tech Stack:** JavaScript ES modules, Canvas 2D, Node `node:test`, Playwright browser verification.

---

## Files

- Modify `src/game/config.js`: add zombie brain recovery constants.
- Modify `src/game/state.js`: add `director.autoWaves` and `director.manualDeployCount`; serialize them.
- Modify `src/game/commands.js`: increment manual deploy count and threat on manual zombie deployment.
- Modify `src/game/systems.js`: remove automatic warning/spawn behavior; compute pressure from live zombie state.
- Modify `tests/systems.test.js`: replace auto-wave tests with local-versus pressure tests.
- Modify `tests/browser-actions.json`: stop expecting `minWaveCount`.
- Run existing browser scenarios to ensure visual/animation behavior still works.

## Task 1: Stop Automatic Zombie Waves

- [ ] Write a failing system test proving `updateGame()` does not spawn zombies after a long started simulation.
- [ ] Replace `updateDirector()` automatic warning/spawn code with pressure-only logic.
- [ ] Verify the new test passes.

## Task 2: Track Manual Zombie Pressure

- [ ] Write a failing system test proving manual `deployZombie` increments `manualDeployCount`.
- [ ] Update command/state serialization to expose `manualDeployCount` and `autoWaves: false`.
- [ ] Make manual deployment nudge pressure upward.
- [ ] Verify the new test passes.

## Task 3: Keep Browser Main Flow Green

- [ ] Remove `minWaveCount` from `tests/browser-actions.json`.
- [ ] Run `npm test`.
- [ ] Run `node scripts/verify-browser.js http://localhost:5174 tests/browser-actions.json`.
- [ ] Run layout and visual-polish browser verification.
