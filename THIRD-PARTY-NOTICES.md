# 第三方代码与素材声明（THIRD-PARTY NOTICES）

本项目是**基于他人开源作品二次开发**的整合主题。下面按「代码」和「素材」分开说明，
以便使用者、以及皮肤市场审核方判断授权边界。

## 一、代码（全部 MIT）

下列项目的**部分代码与样式**被本项目参考或直接复用。各自许可证全文见 `docs/third-party/`。

| 项目 | 作者 | 许可 | 本项目用到的部分 |
|---|---|---|---|
| [dsh-startup-screen](https://github.com/6shenhonghong9/dsh-startup-screen) | 6shenhonghong9 | MIT | 启动动画的整体架构思路：`webServer.tapIndex` 改写 index.html、独立 splash 运行时、避免白闪的注入顺序 |
| [dsh-plugin-naiwa-theme](https://github.com/seaison/dsh-plugin-naiwa-theme) | seaison | MIT | 「奶蛙灵感池」卡片的样式与文案组织方式、发送按钮的圆形头像按钮样式 |
| [dsh-naiwa-theme](https://github.com/seaison/dsh-plugin-naiwa-theme) | seaison | MIT | 主题 token 覆盖手法（`ctx.theme.overrideTokens` 的 `{light,dark}` 结构） |
| [dsh-naiwa](https://github.com/weikangzeng07-ops/dsh-naiwa) | weikangzeng07-ops | MIT | 桌宠引擎（不在本仓库内，仅提供 `patches/naiwa-bounds.patch` 补丁） |
| [dsh-plugin-wallpaper-engine](https://github.com/elysia395/dsh-wallpaper-engine) | elysia395 | MIT | 不复制代码，只在运行时读取其 `/wallpaper-engine/settings` 与 `/wallpaper-engine/inventory` 接口 |
| [dsh-meme](https://github.com/yyh-001/dsh-meme) | yyh-001 | MIT | 不复制代码，只在运行时调用其 `/dsh-memes-api` |

MIT 的义务是：**保留原版权声明与许可文本**。这些文本已收在 `docs/third-party/`，随仓库分发。
MIT 不要求本项目同样开源，也不对原作者构成任何背书。

## 二、素材（授权状态不同，逐项列明）

| 素材 | 来源 | 授权状态 |
|---|---|---|
| `assets/startup/naiwa-startup.mp4` | Minimax H3 生成 | 生成内容的使用受生成平台条款约束；本仓库按「个人非商业展示」分发 |
| `assets/startup/vo-1..4.wav` | edge-tts 合成 + 本项目脚本二次处理 | 语音为合成产物，非真人录音 |
| `assets/startup/sfx-tick.wav`、`sfx-ticks-run.wav`、`naiwa-bed-*.mp3`、`sfx-data-transfer.wav` | 本项目 `build/` 下脚本现场合成 | 本项目原创，随仓库以 CC BY-NC 4.0 分发 |
| `assets/*.png`、`*.jpg`、`*.webp`（奶蛙立绘、头像） | 网络二创作品 | **未取得明确授权**，仅作主题展示。权利人提出异议会立即移除 |
| 壁纸示例 | — | **不在仓库内**，由使用者自行上传 |

> 若你要把本项目用于商业用途、或再分发给客户，请先自行替换上表中「未取得明确授权」的素材，
> 并确认 Minimax 生成内容在你的套餐下允许商用。

## 三、已移除的内容

为避免把来源不明的音频再分发，以下内容**已从仓库删除**：

- `assets/startup/sfx-tick.mp3`、`assets/startup/sfx-ticks-run.mp3`（来自第三方工程的示例音频）
- `assets/startup/voice-1..4.mp3`（早期 edge-tts 直出，已被 `vo-*.wav` 取代）
- 全部壁纸图片（改由使用者自行上传到壁纸引擎）
