# 安装与复刻说明（INSTALL）

> 目标：把这个仓库变成你现在看到的界面——赛博启动动画、灵感池卡片、表情包面板、可拖拽的奶蛙桌宠。
> 全程约 10 分钟。**按顺序做**，每步都有自检项。

## 0. 前提

| 项 | 要求 | 怎么查 |
|---|---|---|
| DSH | Desktop `0.2.1-rc.5` 或更高 | 设置 → 关于 |
| Git | 已安装且在 PATH | `git --version` |
| 网络 | 能访问 github.com | `git ls-remote https://github.com/alaricchanchs-crypto/dsh-naiwa-studio` |

Windows 上 Git 默认不加入 PATH 时，`dsh plugin add` 会报
`git ls-remote failed: 'git' 不是内部或外部命令`。
把 `C:\Program Files\Git\cmd` 加进 PATH 再试。

## 1. 安装本插件（必做）

```powershell
dsh plugin --profile desktop add https://github.com/alaricchanchs-crypto/dsh-naiwa-studio
```

自检：
- 输出里有 `+ dsh-naiwa-studio 0.1.0`
- `~/.dsh/profiles/desktop/package.json` 的 `dsh.profile.bundles` 含 `dsh-naiwa-studio`

## 2. 重启 Desktop（必做）

插件是 client plugin，**必须重启宿主**才加载。重启后会看到：
- 黑底 + 光隧的启动动画（约 6 秒，右下角「跳过片头 · ESC」）
- 侧栏出现「奶蛙灵感池」玻璃卡片

自检：DevTools Console 执行

```js
document.querySelector('.nw-inspiration-anchor')        // 非 null
document.querySelector('[data-naiwa-pet]') !== null      // 视步骤 4
window.__NAIWA_SPLASH_DONE__                             // true（动画结束后）
```

## 3. 壁纸与玻璃配色（可选，但观感差别很大）

本插件的壁纸入口是**转发**到 `dsh-plugin-wallpaper-engine` 的设置页。
不装它的话，点「壁纸库」胶囊不会有反应。

```powershell
dsh plugin --profile desktop add dsh-plugin-wallpaper-engine
```

装完重启，点侧栏「奶蛙灵感池」卡片上右下角的「壁纸库」胶囊，
会依次自动点开：账号菜单 → 设置 → 壁纸引擎。

自检：

```js
await (await fetch('/wallpaper-engine/inventory')).json()   // { total: >0, ... }
```

## 4. 奶蛙桌宠（可选，需要打补丁）

桌宠本体是第三方插件，**不在本仓库内**：

```powershell
git clone https://github.com/weikangzeng07-ops/dsh-naiwa "$env:USERPROFILE\.dsh\plugins\dsh-naiwa"
dsh plugin --profile desktop add "link:$env:USERPROFILE\.dsh\plugins\dsh-naiwa"
```

然后给它打「贴边补丁」（否则蛙拖到离窗口边约 100px 就被看不见的墙挡住）：

```powershell
cd "$env:USERPROFILE\.dsh\plugins\dsh-naiwa"
git apply --check "$PWD\..\..\..\..\..\dsh-naiwa-studio-repo\patches\naiwa-bounds.patch"
git apply         "同上路径"
```

`git apply --check` 退出码为 0 才能继续。**非 0 说明上游版本变了，补丁失配**，
此时跳过本步（桌宠能用，但拖不到边）。

自检：拖蛙到窗口右下角，蛙身应能贴边；左上角不应出现整块不可见方块挡住按钮。

## 5. 验收清单

| 现象 | 判定 |
|---|---|
| 启动动画 6 秒左右自动揭幕 | ✅ |
| 右下角「跳过片头 · ESC」1 秒后淡入 | ✅ |
| 侧栏有「奶蛙灵感池」玻璃卡片 + 「壁纸库」胶囊 | ✅ |
| 表情包面板左上角有虚线「+ 添加表情」格 | ✅ |
| 桌宠能拖到窗口边、能戳、有笑声 | ✅（需步骤 4） |

## 回滚

```powershell
dsh plugin --profile desktop remove dsh-naiwa-studio
```

桌宠补丁回滚：

```powershell
cd "$env:USERPROFILE\.dsh\plugins\dsh-naiwa"
git checkout -- lib/client.js
```

## 常见问题

**启动动画不出现**：看 `~/.dsh/logs/naiwa-splash.log`
- 有 `tapIndex 命中，html N 字符` → 注入成功，检查 `#nb-boot` 是否被别的插件层级盖住
- 只有 `tapIndex=undefined` → 宿主版本过低

**壁纸库胶囊点了没反应**：没装 `dsh-plugin-wallpaper-engine`，见步骤 3。

**表情包面板还是透明**：宿主没重启；本插件的样式只在启动时注入。

**桌宠拖不到边**：补丁未打或打失败，见步骤 4 的 `git apply --check`。