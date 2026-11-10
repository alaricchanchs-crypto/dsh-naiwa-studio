# 没装 git 也能装：直接下载源码压缩包，解压到一个固定目录，再用 link: 方式装进 DSH。
# 用法（PowerShell）：
#   powershell -ExecutionPolicy Bypass -File .\install-no-git.ps1
# 可选：
#   -ProfileName desktop      指定 profile，默认 desktop
#   -InstallDir  <路径>       解压位置，默认 %LOCALAPPDATA%\dsh-naiwa-studio
#   -RepoOwner   <账号>       仓库归属，默认 alaricchanchs-crypto
param(
  [string]$ProfileName = 'desktop',
  [string]$InstallDir  = (Join-Path $env:LOCALAPPDATA 'dsh-naiwa-studio'),
  [string]$RepoOwner   = 'alaricchanchs-crypto',
  [string]$RepoName    = 'dsh-naiwa-studio'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }

# 1) 找 dsh 命令
$candidates = @(
  (Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd'),
  (Get-Command dsh.cmd -ErrorAction SilentlyContinue).Source,
  (Get-Command dsh -ErrorAction SilentlyContinue).Source
) | Where-Object { $_ -and (Test-Path $_) }

if (-not $candidates) {
  throw '找不到 dsh 命令。请确认 DeepSeek Harness 已安装，或手动把 dsh.cmd 加进 PATH。'
}
$dsh = $candidates[0]
Write-Step "使用 dsh: $dsh"

# 2) 下载源码包（HTTPS，不走 git）
$archive = Join-Path $env:TEMP 'dsh-naiwa-studio-main.zip'
$url = "https://codeload.github.com/$RepoOwner/$RepoName/zip/refs/heads/main"
Write-Step "下载 $url"
Invoke-WebRequest -Uri $url -OutFile $archive -UseBasicParsing
Write-Host ("    已下载 {0:N0} KB" -f ((Get-Item $archive).Length / 1KB))

# 3) 解压（包里有一层 <repo>-main/ 目录，剥掉这一层）
if (Test-Path $InstallDir) {
  Write-Step "清理旧目录 $InstallDir"
  Remove-Item $InstallDir -Recurse -Force
}
$tmp = Join-Path $env:TEMP ("naiwa-extract-" + [Guid]::NewGuid().ToString('N').Substring(0, 8))
Expand-Archive -Path $archive -DestinationPath $tmp -Force
$inner = Get-ChildItem $tmp -Directory | Select-Object -First 1
if (-not $inner) { throw '压缩包解压后是空的，下载可能失败。' }
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item (Join-Path $inner.FullName '*') $InstallDir -Recurse -Force
Remove-Item $tmp -Recurse -Force
Remove-Item $archive -Force
Write-Step "已解压到 $InstallDir"

# 4) 装进 profile（link: 方式，不需要 git）
Write-Step "安装到 profile '$ProfileName'"
& $dsh plugin --profile $ProfileName add "link:$($InstallDir -replace '\\','/')"
if ($LASTEXITCODE -ne 0) { throw "安装失败（exit $LASTEXITCODE）。" }

Write-Host ''
Write-Host '装好了。接下来：' -ForegroundColor Green
Write-Host '  1. 完全退出 DeepSeek Harness（关窗口不算退出，用任务管理器结束进程或任务栏右键退出）'
Write-Host '  2. 重新打开，启动动画和灵感池就会出现'
Write-Host ''
Write-Host "卸载： $dsh plugin --profile $ProfileName remove dsh-naiwa-studio"
