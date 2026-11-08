# AGENTS.md — 给 AI 的操作协议

你在一个**正在运行的宿主环境**上工作（DSH Desktop / `dsh web`）。
把宿主当成生产环境：改动前先备份，验证前先隔离。

## 你要做的事

1. 读 `README.md` 了解这是什么（一个 DSH client plugin：主题 + 启动动画 + 侧栏卡片 + 表情包入口）。
2. 严格按 `INSTALL.md` 的**步骤编号**执行，不要跳步，不要自行调换顺序。
3. 每一步执行后跑该步骤的「自检」，**自检不通过就停下来报告**，不要继续往下做。

## 硬约束

- **不要**手工编辑 `~/.dsh/profiles/*/package.json` 的 `dsh.profile.bundles`；一律用 `dsh plugin add/remove`。
- **不要**手工搬移或重建 `~/.dsh/storages/workspace.json`、`sessions/` 目录——这是真实事故的来源。
- 打补丁前必须先备份目标文件：`Copy-Item lib/client.js lib/client.js.bak-<时间戳>`。
- 补丁只允许 `git apply`，**不要**用编辑器手改 `lib/client.js`（那是 4600 行的打包产物）。
- 装插件失败时先看 `.plugin-manager/logs/*/pnpm.log`，不要盲目重试。

## 你需要检查的宿主能力

```js
// 宿主是否支持 index.html 注入（启动动画依赖它）
document.documentElement.outerHTML.includes('nb-boot')
```

- 有 `nb-boot` → 注入路线可用
- 没有 → 宿主版本低于 0.2.1，或插件未加载；先查 `~/.dsh/logs/naiwa-splash.log`

## 验收断言（全部要在 DevTools Console 里跑通）

```js
document.querySelector('.nw-inspiration-anchor')?.getBoundingClientRect().width > 0
document.querySelector('.nap-wallentry, .nw-wallentry')?.textContent.includes('壁纸库')
!!document.querySelector('[data-naiwa-meme-add]')      // 打开表情面板后
!!document.querySelector('canvas.naiwa-pet')            // 装了 dsh-naiwa 后
window.__NAIWA_SPLASH_DONE__ === true                   // 动画播完后
```

## 出问题时

1. 先恢复可用状态（`dsh plugin remove`），不要带病继续改。
2. 在克隆 profile 里复现：`robocopy` 复制 profile（排除 `node_modules`），让克隆自己 `pnpm install`，
   **不要**用 junction 把依赖指回正式环境。
3. 测试端口用 63000 以上，验完杀进程、删克隆。