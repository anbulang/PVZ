# PVZ 在线对战完整体验设计

## 目标

把当前 LAN 房间基础升级为可连续游玩的在线对战体验：两台设备在同一局域网内加入同一房间，一台控制植物方，一台控制僵尸方；双方准备后开局；对局中通过 WebSocket 同步；短线时暂停等待重连；超时未重连则掉线方判负；结束后双方都确认“再来一局”才重置并回到准备阶段。

## 已确认需求

- 范围选择：LAN 完整体验版，不做公网中继或账号系统。
- 开局流程：房主创建房间后，双方各自点“准备”，两边都准备才开始。
- 通信方式：从当前 HTTP 轮询基础增量升级到 WebSocket。
- 依赖策略：允许新增轻量服务端依赖 `ws`。
- 重连策略：同一浏览器保存 `clientId`，刷新页面或短线后 60 秒内恢复原身份和阵营。
- 掉线处理：任意一方掉线后整局暂停，等待重连。
- 超时处理：掉线方 60 秒内未重连则判负。
- 再开一局：房间保留，双方都点“再来一局”后重置游戏状态并重新准备。

## 推荐方案

采用“增量升级到 WebSocket”的方案。保留当前 `src/online/room.js` 的房间模型和权威 `GameState` 思路，把房间核心扩展成明确状态机；新增 WebSocket 传输层承载创建、加入、准备、命令、快照、心跳和重连事件；HTTP 继续负责静态页面服务，并可保留短期兼容 API。

不选择纯重写在线层，因为当前 HTTP 房间基础已经有测试和浏览器验收，推倒重来会增加回归风险。不选择先补完整 HTTP 轮询体验，因为会实现一套很快要被 WebSocket 替换的同步机制。

## 房间状态机

房间显式维护以下状态：

- `lobby`：房间已创建，等待玩家加入或阵营完整。
- `ready`：植物方和僵尸方都在线，等待双方准备。
- `playing`：服务器按固定 tick 推进权威游戏状态并广播快照。
- `pausedForReconnect`：任意一方断线或心跳超时，对局暂停并启动 60 秒重连倒计时。
- `finished`：胜负已定，房间保留，等待双方确认再来一局。

状态转换规则：

- `lobby -> ready`：植物方和僵尸方都已占位并在线。
- `ready -> playing`：双方都设置 `ready: true`。
- `playing -> pausedForReconnect`：任意一方 socket 断开或心跳超时。
- `pausedForReconnect -> playing`：掉线方在 60 秒内用同一 `clientId` 重连。
- `pausedForReconnect -> finished`：60 秒超时未重连，掉线方判负。
- `playing -> finished`：现有胜负条件触发。
- `finished -> ready`：双方都设置 `playAgainReady: true`，服务器重置 `GameState`、准备状态和再开状态。

## WebSocket 消息协议

客户端消息：

- `hello { clientId? }`：建立连接。有本地 `clientId` 时尝试恢复身份；没有时由服务器分配。
- `createRoom { side }`：创建房间并占用 `plant` 或 `zombie` 阵营。
- `joinRoom { roomCode, side, clientId? }`：加入房间，或在 60 秒窗口内以同一 `clientId` 重连原阵营。
- `setReady { ready }`：设置本端准备状态。
- `command { sequence, command }`：提交游戏命令。服务器校验房间状态、阵营、资源和冷却后才应用。
- `playAgainReady { ready }`：结束后设置本端再来一局状态。
- `ping`：应用层心跳；也可配合 `ws` 的 ping/pong。

服务器消息：

- `welcome { clientId }`：确认客户端身份，浏览器应保存到 `localStorage`。
- `roomSnapshot`：广播房间码、房间状态、双方阵营、在线状态、准备状态、掉线倒计时、再来一局状态和当前客户端阵营。
- `gameSnapshot`：广播权威游戏状态摘要和渲染所需状态。
- `commandAck { sequence, accepted }`：确认命令是否被服务器接收。
- `error { code, message }`：房间不存在、阵营已占用、状态不允许、非法命令、重连失败等。

服务器是唯一权威来源。在线局里客户端不本地推进模拟，只保留本地卡牌选择和 UI 状态；所有会影响对局的命令都经服务器校验和广播。

## 前端交互设计

采用顶部紧凑房间条，避免破坏当前 Canvas 主体验。

未在线时，房间条显示：

- 创建房间按钮。
- 房间码输入。
- 阵营选择。
- 加入按钮。

等待准备时，房间条显示：

- 房间码。
- 植物方和僵尸方的在线状态。
- 双方准备状态。
- 本端准备/取消准备按钮。

对局中，房间条显示：

- 当前房间码。
- 本端阵营。
- 对手在线状态。
- 简短同步状态或延迟提示。

掉线暂停时，房间条和 Canvas overlay 都显示：

- 掉线方。
- 剩余重连秒数。
- “等待重连”状态。

结束后，房间条和 Canvas overlay 显示：

- 胜负结果和原因。
- 双方“再来一局”确认状态。
- 本端再来一局/取消按钮。

交互约束：

- 房间未进入 `playing` 前不能提交种植、收阳光、投放僵尸等 gameplay command。
- `pausedForReconnect` 时禁止 gameplay command。
- 本端只能选择和操作自己阵营的卡牌。
- 单方不能强制重置对局；必须双方都确认再来一局。

## 模块边界

### `src/online/room.js`

房间核心，不绑定具体传输协议。负责：

- 房间状态机。
- 阵营占位和身份恢复。
- 准备、掉线、重连、超时、再来一局规则。
- gameplay command 授权。
- 调用现有 `commands.js`、`systems.js`、`state.js` 推进权威状态。
- 生成 `roomSnapshot` 和 `gameSnapshot`。

### `src/online/ws-server.js`

WebSocket 传输层。负责：

- 接收和校验 JSON 消息结构。
- 维护 socket 到 `clientId`/room 的映射。
- 调用 `room.js` 的核心 API。
- 广播房间快照和游戏快照。
- 处理 ping/pong、断线和心跳超时。

### `src/online/http-server.js`

静态服务和 WebSocket 挂载入口。负责：

- 继续服务 `index.html`、脚本、样式和素材。
- 创建 HTTP server 后挂载 `ws-server.js`。
- 保留或逐步减少现有 HTTP API，避免一次性破坏已验证入口。

### `src/online/client.js`

浏览器在线控制器。负责：

- 建立 WebSocket 连接。
- 保存和读取 `localStorage` 中的 `clientId` 和最近房间码。
- 发送房间、准备、命令和再开消息。
- 接收 `roomSnapshot` 和 `gameSnapshot`，更新现有 `GameState`。
- 保留本地 selection，避免被服务器快照覆盖。
- 在断线时显示等待和重连状态。

## 测试策略

### Room Core 单元测试

覆盖：

- 两端加入后进入 `ready`。
- 单方准备时不开始，双方准备后进入 `playing`。
- 未 `playing` 时拒绝 gameplay command。
- `playing` 中断线进入 `pausedForReconnect`。
- 60 秒内同 `clientId` 重连恢复原阵营并继续。
- 60 秒超时未重连判掉线方负。
- `finished` 后双方都确认再来一局才重置。

### WebSocket 集成测试

使用 `ws` 客户端连接本地 server，覆盖：

- `hello` 分配或恢复 `clientId`。
- `createRoom`、`joinRoom`、`setReady` 的广播。
- 双方准备后服务器广播 `playing`。
- gameplay command 的 `commandAck` 和 `gameSnapshot`。
- 非法阵营、房间不存在、状态不允许等错误码。
- socket 断开后的暂停、重连和超时。

### 双浏览器验收

使用 Playwright 打开两个页面，覆盖：

- 植物端创建房间，僵尸端加入。
- 双方准备后开局。
- 植物端种植，僵尸端投放，双方收到一致快照。
- 刷新其中一端后 60 秒内恢复原阵营和当前局面。
- 模拟断线超时后掉线方判负。
- 结束后双方点再来一局，房间重置并回到准备状态。

### 回归测试

保留现有本地双人和普通浏览器流程，确保离线模式仍能运行，现有动画、素材、布局、阳光、僵尸投放和胜负逻辑不被 WebSocket 改动破坏。

## 非目标

- 不做公网匹配、账号、排行榜或持久化战绩。
- 不做 NAT 穿透或云中继。
- 不做本地预测和复杂回滚；在线局以服务器快照为准。
- 不重写 Canvas 渲染和核心游戏模拟。

## 验收标准

- 两台设备可在同一 LAN 地址打开游戏，创建/加入同一房间。
- 双方准备后对局开始，未准备不能提前操作。
- 双方操作会在两端同步显示，并由服务器权威裁决。
- 一方刷新页面或短线后，60 秒内恢复原阵营和当前局面。
- 一方掉线时整局暂停，超时未重连后掉线方判负。
- 结束后双方都点再来一局，房间重置并回到准备阶段。
- 自动化验证覆盖 room core、WebSocket 集成、双浏览器流程和本地模式回归。
