# install.ps1 - 一键安装 dsh-naiwa-studio 及其可选依赖
# 用法:  powershell -ExecutionPolicy Bypass -File scripts\install.ps1 [-Profile desktop] [-WithWallpaper] [-WithPet]
param(
  [string]$Profile = "desktop",
  [switch]$WithWallpaper,
  [switch]$WithPet
)
$ErrorActionPreference = "Stop"
$repo = "https://github.com/alaricchanchs-crypto/dsh-naiwa-studio"

function Need-Git {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    $cand = "C:\Program Files\Git\cmd"
    if (Test-Path $cand) { $env:PATH = "$env:PATH;$cand" }
    else { throw "找不到 git，请先安装 Git for Windows 并加入 PATH" }
  }
}

Write-Host "[1/4] 检查环境" -ForegroundColor Cyan
Need-Git
Write-Host "  git: $((git --version))"

Write-Host "[2/4] 安装 dsh-naiwa-studio" -ForegroundColor Cyan
dsh plugin --profile $Profile add $repo
if ($LASTEXITCODE -ne 0) { throw "安装失败，看 .plugin-manager/logs/*/pnpm.log" }

if ($WithWallpaper) {
  Write-Host "[3/4] 安装 dsh-plugin-wallpaper-engine（壁纸与玻璃配色）" -ForegroundColor Cyan
  dsh plugin --profile $Profile add dsh-plugin-wallpaper-engine
}

$petDir = Join-Path $env:USERPROFILE ".dsh\plugins\dsh-naiwa"
if ($WithPet) {
  Write-Host "[4/4] 安装桌宠 dsh-naiwa 并打贴边补丁" -ForegroundColor Cyan
  if (-not (Test-Path $petDir)) {
    git clone https://github.com/weikangzeng07-ops/dsh-naiwa $petDir
    dsh plugin --profile $Profile add "link:$petDir"
  }
  $target = Join-Path $petDir "lib\client.js"
  $patch  = Join-Path $PSScriptRoot "..\patches\naiwa-bounds.patch"
  if (Test-Path $target) {
    Copy-Item $target "$target.bak-$(Get-Date -Format yyyyMMddHHmmss)" -Force
    Push-Location $petDir
    git apply --check $patch 2>$null
    if ($LASTEXITCODE -eq 0) {
      git apply $patch
      Write-Host "  补丁已应用：桌宠可以拖到窗口边缘" -ForegroundColor Green
    } else {
      Write-Warning "补丁与当前 dsh-naiwa 版本不匹配，已跳过（桌宠可用，但拖不到边）"
      Write-Warning "回滚命令: git checkout -- lib/client.js"
    }
    Pop-Location
  }
}

Write-Host ""
Write-Host "完成。请【完全退出并重启 DSH Desktop】，否则 client 插件不会加载。" -ForegroundColor Yellow
Write-Host "验收清单见 INSTALL.md 第 5 节。" -ForegroundColor Yellow