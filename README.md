# dsh-naiwa-studio

奶蛙主题插件 for [DeepSeek Harness](https://github.com/deepseek-ai)：赛博启动动画、灵感池卡片、
表情包快捷上传、壁纸引擎整合、玻璃质感 UI。

## 功能

- **启动动画**：`tapIndex` 注入独立 splash 运行时，5.6s 分镜 + 4 句机械语音 + 故障转场 + 真实加载进度
- **灵感池**：侧栏卡片，点击弹出奶蛙语录，跟壁纸引擎的玻璃配色同步
- **表情包**：面板左上角 + 卡，选图直接进当前情绪桶
- **壁纸**：整合 [dsh-wallpaper-engine](https://github.com/elysia395/dsh-wallpaper-engine)，
  入口在灵感池卡片上，强调色改为片头激光青
- **桌宠**：与 [dsh-naiwa](https://github.com/weikangzeng07-ops/dsh-naiwa) 协作，
  提供命中区穿透与边界补丁

## 安装

```bash
# 1) 先装依赖插件
dsh plugin --profile desktop add dsh-plugin-wallpaper-engine
dsh plugin --profile desktop add "github:weikangzeng07-ops/dsh-naiwa"

# 2) 装本插件
dsh plugin --profile desktop add "github:alaricchanchs-crypto/dsh-naiwa-studio"

# 3) 重启 Desktop
```

## 桌宠补丁

本仓库**不包含** `dsh-naiwa` 的引擎文件，只提供补丁：

```bash
git apply patches/naiwa-bounds.patch   # 在 dsh-naiwa 目录内执行
```

补丁内容：让可见蛙身能贴到窗口边（原实现按整块画布夹取）、窗口/全屏切换时按比例搬移、
初始位置按可视视口计算。

## 素材

本仓库**不含壁纸**。壁纸请用 dsh-wallpaper-engine 的上传入口自行添加。

启动动画与表情素材的授权见 [LICENSE-ASSETS](LICENSE-ASSETS)，
第三方致谢见 [CREDITS](CREDITS.md)。

## 许可

- 代码：MIT
- 图像与音频：CC BY-NC 4.0（禁商用）

## 安装

```powershell
dsh plugin --profile desktop add https://github.com/alaricchanchs-crypto/dsh-naiwa-studio
```

然后**完全重启 DSH Desktop**。完整步骤、可选依赖（壁纸引擎 / 桌宠）、验收清单与回滚，
见 **[INSTALL.md](INSTALL.md)**；一键脚本见 `scripts/install.ps1`。

给别人（或别人的 AI）复现这套效果：把仓库地址 + `AGENTS.md` 一起给它，让它按协议执行。