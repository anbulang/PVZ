# PVZ 在线对战基础版实施计划

> **给 agentic workers：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务执行。所有步骤使用 checkbox（`- [ ]`）跟踪。

**目标：** 让两台设备加入同一个 LAN 房间，一台作为植物方，一台作为僵尸方，并围绕同一个服务器权威状态对战。

**架构：** 保留现有 Canvas 渲染和本地模拟结构。新增零依赖 Node HTTP 房间服务器，由服务器持有权威 `GameState`、按阵营校验命令、推进模拟，并把快照返回给浏览器端渲染。

**技术栈：** JavaScript ES modules、Node `http`、Canvas 2D、Node `node:test`、Playwright。

---

## 文件范围

- 新建 `src/online/room.js`：房间模型、阵营分配、命令授权、权威 tick、快照序列化。
- 新建 `src/online/http-server.js`：静态文件服务和 `/api/rooms` 接口。
- 新建 `src/online/client.js`：浏览器在线控制器、本地 selection、轮询和命令提交。
- 新建 `scripts/online-server.js`：LAN 在线对战启动入口。
- 新建 `scripts/verify-online-browser.js`：双页面 Playwright 验收脚本。
- 修改 `src/game/input.js`：支持注入命令派发器和本地 selection。
- 修改 `src/main.js`：接入在线控制器，在线时跳过本地模拟 tick。
- 修改 `index.html` 和 `src/styles.css`：在 Canvas 上方加入紧凑房间控制条。
- 修改 `package.json`：新增 `online` 和 `verify:online-browser` 脚本。
- 新增 `tests/online-*.test.js`，并更新 `tests/layout.test.js`。

## 已完成任务

- [x] 先写 room 失败测试，覆盖两端阵营分配、共享权威命令、错误阵营命令拒绝。
- [x] 实现 `src/online/room.js`，直到 `node --test tests/online-room.test.js` 通过。
- [x] 先写 HTTP server 失败测试，覆盖创建房间、加入房间、命令同步和静态页面服务。
- [x] 实现 `src/online/http-server.js`，直到 `node --test tests/online-server.test.js` 通过。
- [x] 先写 input 失败测试，证明 `commandFromPoint()` 可以使用本地在线 selection，而不是只依赖 `state.selection`。
- [x] 更新 `src/game/input.js`，直到 `node --test tests/layout.test.js` 通过。
- [x] 先写 online client 失败测试，覆盖快照合并、本地 selection 和阵营命令过滤。
- [x] 实现 `src/online/client.js`，直到 `node --test tests/online-client.test.js` 通过。
- [x] 接入 `src/main.js`、`index.html` 和 `src/styles.css`。
- [x] 新增 `scripts/online-server.js`、`scripts/verify-online-browser.js` 和 package scripts。
- [x] 运行 `npm test`。
- [x] 运行 `node scripts/verify-browser.js http://127.0.0.1:5191 tests/browser-actions.json`。
- [x] 运行 `node scripts/verify-online-browser.js http://127.0.0.1:5191`。
