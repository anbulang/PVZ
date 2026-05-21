原始提示：[@superpowers](plugin://superpowers@openai-curated) 做一款植物大战僵尸的游戏

# 进度

- 已确认方向：本地双人，植物方 vs 僵尸方，架构预留未来 WebSocket 同步。
- 已确认约束：不打包原作素材或游戏本体，使用原创 Canvas 绘制素材，保留用户本地素材替换入口。
- 当前实现：核心状态、命令队列、模拟系统、输入映射、Canvas 渲染、素材管线、浏览器验证和 LAN 在线房间基础已经写入。

## 验证

- 运行 `npm test`：通过，13 个测试。
- 针对 `http://localhost:5173` 运行浏览器验证：通过。
- 浏览器状态包含 2 个植物、1 个僵尸和活动弹丸。
- console 错误：无。
- 截图检查确认卡牌、5 行草坪、植物、僵尸、弹丸、投放区和状态栏可见。
- 将程序化单位、卡牌和弹丸绘制替换为从 `/assets` 加载的素材。
- 针对 `http://localhost:5174` 运行素材替换后的浏览器验证：通过。
- 截图检查确认植物卡牌、僵尸卡牌、已放置植物、已投放僵尸和弹丸使用下载素材包。

## 后续建议

- 基于现有命令队列继续补 WebSocket 房间传输。
- 增加可选的用户自定义素材 manifest：`assets/manifest.json`。
- 增加短局、标准局、长局三套平衡预设。

## 2026-05-05 玩法与表现升级迭代

- 新增被动阳光和向日葵产出的可点击阳光掉落。
- 新增每路一次性割草机，作为突破前的失误缓冲。
- 新增 director 波次、泳道预警、自动压力刷怪、波次数和威胁条。
- 新增樱桃炸弹和小鬼僵尸，补充战术选择。
- 强化 HUD、冷却和资源反馈、泳道预警、阴影、小车、阳光和爆炸效果。
- 运行 `npm test`：通过，18 个测试。
- 运行 `node scripts/verify-browser.js http://localhost:5174 tests/browser-actions.json`：通过。
- 截图检查确认扩展卡牌、可收集阳光、小车、压力条、单位、弹丸和状态栏可见。

## 2026-05-05 素材动画和音频迭代

- 用素材包 `小推车.png` 替换手绘小车。
- 新增 Web Audio 程序化背景音乐和种植、收阳光、僵尸生成、命中、啃食、掉甲、爆炸、小车、波次预警音效。
- 新增普通、小鬼、路障、铁桶、冲刺僵尸的啃食动画映射。
- 增加植物被啃食形变、咬痕和更强受击反馈。
- 新增护甲掉落状态，带甲僵尸达到阈值后切换无甲外观，并在脚边显示掉落护甲。
- 扩展浏览器验证脚本，支持命令驱动场景和 `eating` / `armorDropped` 状态期望。
- 运行 `npm test`：通过，19 个测试。
- 运行普通流程和反馈流程浏览器验证：通过。
- 截图检查确认素材小车、啃食动画、植物形变、咬痕和护甲掉落反馈可见。

## 2026-05-05 真实 GIF 和 OGG 音频修复

- 用 `assets/音效` 下的真实 OGG 播放替代上一版程序化振荡器音频。
- 将素材映射拆分为 `plantIdle`、`zombieWalk`、`zombieEat`、`zombieFeedback`、`ui`、`sfx`、`music`。
- 移除持续人工摆动；僵尸通过 `zombie.eating` 在走路和啃食 GIF 间切换，植物只保留短促咬合压缩。
- 在 `render_game_to_text()` 中增加音频调试状态，浏览器验证会在关键 GIF / OGG 缺失或音频加载错误时失败。
- 运行 `npm test`：通过，20 个测试。
- 运行普通流程和反馈流程浏览器验证：通过，`audioUnlocked: true`、`musicActive: true`，无缺失素材和 console 错误。

## 2026-05-05 阳光反馈和非人声背景音乐修复

- 背景音乐改为低音量 `rain.ogg`，并保留 `phonograph.ogg` 兜底。
- 阳光拾取物绘制到植物上方，显示拾取金额，向日葵产出的阳光位于植物头部上方。
- 新增 `+25` 收集反馈，并在状态序列化中带上金额用于浏览器验证。
- 只给真实场上植物保留克制待机摆动，卡牌图标保持静止。
- 增加向日葵产量、收集反馈金额、非人声音乐映射和多帧僵尸走路 GIF 测试。
- 运行 `npm test`：通过，24 个测试。
- 运行普通、阳光、反馈浏览器流程：通过。
- 截图检查确认向日葵阳光 `25`、收集 `+25`、走路僵尸和场上单位可见。

## 2026-05-05 用户指定背景音乐和阳光余额可见性

- 背景音乐改为 `assets/音效/ZombiesOnYourLawn.ogg`。
- `mainmusic.mo3` 未接入浏览器音频路径，因为 HTMLAudio 无法原生播放 MO3，需要额外解码或转换。
- 新增顶层植物方阳光余额徽标，避免当前阳光总量被种子卡遮挡。
- 增加 HUD 附近 `+/-` 阳光变化反馈，分别表示种植消耗和收集收入。
- 更新种植和阳光收集状态文本，包含花费、获得和当前余额。
- 运行 `npm test`：通过，24 个测试。
- 运行阳光浏览器验证：通过，当前阳光 125 且正向阳光变化反馈可验证。

## 2026-05-05 僵尸 GIF 选择和战斗可读性

- 集中管理僵尸视觉选择，让 `walk` 和 `eat` 状态直接映射到对应场景 GIF。
- 修复带甲僵尸在啃食状态下仍保留原啃食 GIF，例如 `路障僵尸啃食.gif`。
- 在序列化中增加 `visualState` 和 `visualAsset`，用于浏览器验证。
- 增加 `普通僵尸走路.gif`、`路障僵尸啃食.gif` 的单元和浏览器断言。
- 曾加入漂浮伤害数字和 `击倒` 反馈，随后按用户要求移除所有数值伤害显示。
- 保留血条、命中闪烁、啃食 GIF、护甲掉落和非数值 `击倒` 反馈。
- 运行 `npm test`：通过，25 个测试。
- 普通、阳光和反馈浏览器流程通过，截图中不再显示 `-24` / `-26` 伤害数字。

## 2026-05-05 素材驱动基础版

- 新增 `ASSET_MANIFEST`，同时保留 `ASSET_PATHS` 兼容层，覆盖场景、UI、植物、僵尸、弹丸和音频分组。
- Canvas 背景切到白天场景素材，HUD 优先使用种子商店、阳光计数器、铲子槽和 FlagMeter 素材。
- 序列化新增 `visualAssets.scene` 和 `visualAssets.ui`，浏览器验证可以证明 Canvas 使用真实素材路径。
- 用 `zombieDeath` effect 替换僵尸击倒文字，绘制 `僵尸死.gif`、`小鬼死亡.gif`、`橄榄球僵尸死.gif` 等死亡 GIF。
- 增加视觉素材接线和单位死亡状态 GIF 浏览器场景。
- 运行 `npm test`：通过，26 个测试。
- 普通、反馈、阳光和视觉素材流程通过。

## 2026-05-07 扩展单位和特殊状态

- 植物和僵尸卡牌栏改为紧凑双行布局，容纳更多单位。
- 新增植物：`repeater`、`twinSunflower`、`torchwood`、`potatoMine`、`jalapeno`。
- 新增僵尸：`flag`、`screen`、`zamboni`。
- 接入新植物、新僵尸、火豌豆、土豆雷武装态、铁门僵尸、冰车和火爆辣椒相关素材与音效。
- 增加 `plant.visualState` 和 `plant.visualAsset` 序列化。
- 新增 `rowFire` 清行视觉反馈，并在截图中可见。
- 运行 `npm test`：通过，32 个测试。
- 普通、阳光、反馈、扩展单位、视觉素材、单位死亡和特殊植物浏览器场景全部通过。

## 2026-05-08 布局和僵尸 GIF 验证

- 将 HUD 卡牌热区和阳光计数器移到独立槽位，避免植物余额覆盖种子卡。
- 新增小车专用泳道 overlay，并调整白天背景裁剪，避免小车行被房屋纹理干扰。
- 每种可玩僵尸在走路和啃食状态下都保留自己的场景 GIF，护甲掉落不再退回普通僵尸外观。
- 僵尸绘制记录状态键，并序列化 `animationSource: "gif"` 供浏览器验证。
- 增加布局和 GIF 动画测试，包括浏览器像素差异检查。
- 运行 `npm test`：通过，35 个测试。
- 布局、GIF 动画、普通、阳光、反馈、视觉素材、扩展单位和特殊植物场景通过。

## 2026-05-11 到 2026-05-14 游戏工作室体验和 UI 修复

- 使用 Chrome / Playwright 试玩开局流程，发现阳光堆叠和自动波次行选择影响节奏。
- 增加点击阳光计数器一键收集全部可见阳光的快捷方式，同时保留单个 `+amount` 反馈。
- 分散同源阳光拾取物，降低重叠；director 优先攻击已有植物防线的行。
- 新增 `started` 模拟标志，计时器、资源、波次和僵尸移动等待玩家第一次交互后才开始。
- 新增 `准备开始` overlay，并说明选择卡牌会启动计时器。
- 合并相近同类阳光拾取物，最高合并到 100，降低中期视觉噪音。
- 生成并接入 `generated-assets/` 原创素材集，包括草坪、卡牌、资源、状态板、阳光、小车、铲子、弹丸、特效、植物条和僵尸走路/啃食/死亡条。
- 新增 `SPRITESHEET_MANIFEST`，Canvas 优先使用生成 PNG spritesheet，保留本地 `assets/...` GIF / PNG 兜底。
- 重建 HUD 固定槽位，移除卡牌文字，仅保留图标、费用和冷却。
- 用 Canvas 绘制稳定面板替代拉伸的生成 HUD / status / overlay 面板。
- 新增左侧房屋立面和半透明小车车库槽。
- 运行 `npm test`：从 39 个测试增长到 46 个测试，均通过。
- 多个浏览器场景通过，截图确认准备 overlay、开局摆放、中期阳光/战斗、啃食/护甲反馈和爆炸效果清晰。

## 2026-05-13 到 2026-05-17 对齐、素材和护甲审计

- 重新生成并接入 `generated-assets/scene/house-left.png`，让房屋和小车区域更自然。
- 新增 `generated-assets/ui/sun-padded.png`，避免阳光图标在计数器或拾取物中裁切。
- 调整脑力计数器、时间和压力面板，让中央信息列更紧凑。
- 将植物和僵尸锚点固定到格子地面，修复精灵图和网格不贴合的问题。
- 防止资源不足或冷却中的卡牌在命令层被选中。
- 移除笨重小车车库面板，让小车位于左侧石路上。
- 强制所有僵尸死亡动画使用生成 spritesheet，不再回退旧 GIF 死亡素材。
- 收紧植物和僵尸卡牌构图，移除场上血条，重建 padded 阳光和小车图标。
- 修复选中卡牌 overlay 遮挡单位图的问题，改为 Canvas 描边高亮。
- 精简底部状态栏，降低掉落护甲尺寸并移动到地面。
- 独立 code review 后修复关键问题：成功种植或投放后清除对应选中卡，避免冷却或资源不足卡牌仍保持选中。
- 将 `/assets` 加入 `.gitignore`，避免提交用户本地素材包绝对 symlink。
- 运行 `python3 scripts/remaster-imagegen-assets.py`：通过。
- 运行 `npm test`：通过，最高增长到 51 个测试。
- 布局、反馈、视觉素材、单位状态、扩展单位和 spritesheet 动画浏览器验证通过。

## 2026-05-15 单个阳光收集反馈修复

- 根因：收集一个阳光会同时创建 `collectSun` effect 和正向 `sunDelta` effect，导致同一个 `+25` 渲染两次。
- 先增加失败回归，确认一个阳光拾取物产生 2 个正向金额反馈。
- 从 `collectSun` 和 `collectAllSun` 中移除正向 `sunDelta` effect，保留植物花费时的负向 `sunDelta`。
- 更新阳光浏览器验证，要求收集期间没有正向 `sunDelta`。
- 运行 `npm test`：通过，47 个测试。
- 运行 `node scripts/verify-browser.js http://localhost:5174 tests/browser-sun-actions.json`：通过。
- 定向 Playwright 检查通过：状态中只有一个正向 `collectSun +25` effect，没有正向 `sunDelta`。

## 2026-05-16 到 2026-05-17 僵尸死亡和护甲掉落修复

- 根因：`scripts/remaster-imagegen-assets.py` 仍通过旧的 `transformed_frames(..., "death")` 路径生成部分僵尸死亡条，画面像程序化淡出。
- 所有可玩僵尸死亡条改为 Codex imagegen atlas 帧或静态僵尸裁剪生成，并加入掉落物、倒下、尘土和残留帧。
- 强制 `ASSET_PATHS.zombieDeath` 只指向生成 spritesheet，并增加测试阻止旧 GIF fallback 和旧死亡生成路径。
- 根因：`armor-cone.png` 和 `armor-runner.png` 曾复用 bucket 裁剪，导致路障和橄榄球僵尸掉落错误护甲。
- 重新从 Codex 生成素材裁剪路障帽和橄榄球头盔，旋转为落地碎片并增加裂纹。
- 集中运行时护甲掉落资源查找 `armorDropAssetFor()`，并在 `render_game_to_text()` 序列化 `visualAsset`。
- 强化测试：四类护甲掉落素材必须互不相同，每类带甲僵尸必须发出匹配的 `hatType` 和资源路径。
- 运行 `python3 scripts/remaster-imagegen-assets.py`：通过。
- 运行 `npm test`：通过，51 个测试。
- 反馈浏览器验证通过，截图和 contact sheet 确认路障、铁桶、铁门、橄榄球头盔是不同碎片。

## 2026-05-17 HUD 卡牌区再平衡

- 使用 Game Studio UI pass 调整顶部 HUD：铲子移到阳光计数器下方单独工具槽，植物卡牌板收窄，僵尸卡牌板扩大。
- 在 `src/game/input.js` 集中 HUD 矩形，渲染面板、点击热区和布局测试共享同一坐标来源。
- 中心状态列改为紧凑的时间、脑力和压力组合。
- 放大僵尸卡牌点击区和图像比例，让僵尸选择侧更像主要操作面。
- 更新浏览器点击场景以适配新的僵尸卡牌位置。
- 运行 `npm test`：通过，51 个测试。
- 布局、视觉素材和普通浏览器流程通过。

## 2026-05-18 视觉精修验证

- 小鬼僵尸脑力成本降到 `40`，并用命令层平衡回归验证。
- 锁定 HUD 命中框和绘制契约：左侧工具架、紧凑植物面板、对齐的时间/脑力/压力列和更大的僵尸卡牌面板。
- 增加视觉精修所需生成素材覆盖，包括 padded 阳光、脑力计数器、房屋条、小车、双发射手、护甲掉落和生成僵尸死亡条。
- 僵尸死亡 effect 改为贴地并向下倒，不再向上漂。
- 增加 1280x720、1440x900 和大窗口浏览器动作，支持逻辑 Canvas 点击缩放。
- 运行 `npm test`：通过，59 个测试。
- 运行 `git diff --check`：通过。
- 普通、布局、视觉素材、单位状态、阳光、反馈、扩展单位、特殊植物和 spritesheet 动画浏览器验证全部通过。
- 运行三种视觉精修视口验证：均通过，并生成 `test-results/visual-polish-1280.png`、`test-results/visual-polish-1440.png`、`test-results/visual-polish-large.png`。
- 后续仍待玩法专题处理：移除自动僵尸波次、重做完整双人经济、重新平衡植物方优势。

## 2026-05-19 本地双人规则和平衡

- 在 `docs/superpowers/specs/` 和 `docs/superpowers/plans/` 下增加中文设计和实施说明。
- director 从自动僵尸波次改为压力模型：`autoWaves: false`，不再 warning，不再自动 `spawnZombie()`。
- 手动僵尸投放会增加 `director.manualDeployCount`，清除 warning 状态，并提高压力条。
- 僵尸脑力按固定本地对战速率持续恢复，并受 `ROUND.maxZombieBrain` 限制。
- 浏览器验证新增 `directorAutoWaves`、`maxWaveCount`、`minManualDeployCount` 期望。
- 运行 `npm test`：通过，60 个测试。
- 运行 `git diff --check`：通过。
- 普通、布局、视觉精修、阳光、反馈和 spritesheet 动画浏览器验证全部通过。
- 普通浏览器状态确认 `autoWaves: false`、`manualDeployCount: 1`、`waveCount: 0`，并有 1 个手动投放的走路僵尸。
- 平衡迭代中降低植物滚雪球速度，提高僵尸持续压力和 combo 脑力返还。
- 新增 `tests/browser-versus-balance-actions.json`，验证两次手动投放、combo 返还、手动压力和 spritesheet 走路僵尸。
- 计时器 HUD 明确显示 `剩余 210s`，并在 `render_game_to_text()` 中加入胜利条件。
- 回合时长、初始阳光、被动阳光、向日葵产出、射手伤害、僵尸脑力、combo 返还和最后一分钟压力均完成调优。
- 运行 `npm test`：通过，63 个测试。
- 浏览器确认 HUD 显示 `剩余 210s`、初始阳光 `125`、初始脑力 `120`。

## 2026-05-20 本地服务持久化和 LAN 暴露

- 根因：之前的 `localhost:5174` 依赖 Codex / Terminal 前台进程，进程结束后服务消失。
- 新增 `scripts/com.pvz.localserver.plist`，通过用户 LaunchAgent 启动 `/usr/bin/python3 -m http.server 5174`。
- 使用 `launchctl bootstrap`、`launchctl kickstart -k` 加载并启动服务。
- 验证 `launchctl print gui/501/com.pvz.localserver`：状态为 `running`，pid 为 `23165`。
- 验证 `curl -I http://localhost:5174/`：HTTP 200。
- 刷新 in-app browser：标题为 `花园攻防本地双人版`，console 错误为空。
- 用户明确批准将 PVZ 本地服务暴露到 LAN。
- 将 `scripts/com.pvz.localserver.plist` 从 `--bind 127.0.0.1` 改为 `--bind 0.0.0.0`。
- 重新加载 LaunchAgent，并确认实际服务参数包含 `--bind 0.0.0.0`。
- 验证 `curl -I http://localhost:5174/` 和 `curl -I http://192.168.2.15:5174/`：均为 HTTP 200。

## 2026-05-21 在线对战基础

- 在现有隔离 Codex worktree 中创建分支 `codex/online-battle`。
- 新增零依赖 LAN 在线房间服务器，服务器持有权威游戏状态、双人植物/僵尸阵营分配、命令校验、server tick、快照和静态文件服务。
- 新增浏览器在线控件，支持创建房间、输入房间码加入、选择植物方或僵尸方。
- 输入处理改为在线模式下 selection 保持本地，真实 gameplay command 发送到房间服务器。
- 新增 `npm run online -- <port>` 用于 LAN 对战，新增 `npm run verify:online-browser -- <url>` 用于双页面在线验证。
- 增加 room 行为、HTTP endpoints、本地在线 selection 和阵营命令过滤的 TDD 覆盖。
- 运行 `npm test`：通过，72 个测试。由于 sandbox 会阻止本地端口绑定，通过的完整测试是在已批准的 sandbox escalation 下执行。
- 运行 `node scripts/verify-browser.js http://127.0.0.1:5191 tests/browser-actions.json`：通过，无 console 错误和缺失素材。
- 运行 `node scripts/verify-online-browser.js http://127.0.0.1:5191`：通过。两个 Chromium 页面加入房间 `QOBV`，植物方放置 `peashooter`，僵尸方投放 `basic`，两端收到一致的植物和僵尸实体。

## 2026-05-22 WebSocket 在线对战完整体验

- 使用 `ws` 将 LAN 在线对战从 HTTP polling 升级为 WebSocket 房间传输，HTTP 静态服务继续保留。
- 新增显式房间阶段：`lobby`、`ready`、`playing`、`pausedForReconnect`、`finished`。
- 新增双方准备、60 秒同 `clientId` 重连、掉线暂停、超时判负和双方确认再来一局。
- 更新浏览器房间面板，显示在线阶段、准备状态、重连暂停和再来一局控件。
- 浏览器在线客户端改为 `/ws`，保留本地卡牌 selection，只把真实 gameplay command 发送到服务器。
- 已验证 room core、HTTP 兼容入口、WebSocket 协议、现有本地流程、主浏览器回归和双浏览器在线流程。
- 运行 `npm test`：通过，83 个测试。由于 sandbox 会阻止本地端口监听，完整测试使用已批准的 sandbox escalation 执行。
- 运行 `node scripts/verify-browser.js http://127.0.0.1:5191 tests/browser-actions.json`：通过，无 console 错误、无缺失素材，`director.autoWaves === false`，`manualDeployCount === 1`。
- 运行 `node scripts/verify-online-browser.js http://127.0.0.1:5191`：通过。两个 Chromium 页面加入房间 `TAYN`，双方 `ready: true`，植物方放置 `peashooter`，僵尸方投放 `basic`，刷新僵尸页面后恢复 `zombie` 身份，两端实体一致。
- 运行 `git diff --check`：通过。
