/**
 * dsh-naiwa-skin — client half（奶蛙皮肤的前端部分）
 *
 * 三件事，全部用 DOM / CSS 完成，不依赖 React 或任何构建产物：
 *   1. 启动动画：奶蛙从上面掉进池子，暖黄底 + 雨丝，2.2 秒后自动淡出，点一下可跳过。
 *   2. 界面背景：奶黄径向光晕 + 向上飘的水泡，铺在最上层但用遮罩避开中间正文区。
 *   3. 可交互桌宠：右下角奶蛙，会呼吸、会跳、会说话、能拖着走，双击打开人物设定卡。
 *
 * 素材以 data URI 内联（由 build/bundle.py 注入），因此不依赖宿主静态路由。
 *
 * ⚠️ 客户端插件不能用 ESM：宿主把这些文件当普通 <script> 拼成一包下发，
 *    出现 `import` / `export` 会让整包语法错误，界面直接起不来。
 *    必须自己调 window.__ModuleLoader__.load() 注册（与 dsh-meme / dsh-memory-evolve 同款）。
 */
window.__ModuleLoader__.load({
  id: 'dsh-naiwa-studio',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    /* __ASSETS__ */

    /** 本插件不依赖任何客户端服务，纯 DOM 注入。 */
    const inject = ['theme', 'sessions']

/** 允许用户按 Ctrl/⌘ 双击把桌宠藏起来（本页生效）。 */
const LS_POS = 'dsh-naiwa:pet-pos'
const LS_HIDDEN = 'dsh-naiwa:pet-hidden'
const LS_SOUND = 'dsh-naiwa:sound'

/** 一次会话内点击次数达到此值时撒花瓣（奶蛙的彩蛋）。 */
const ROSE_AT = 7

const CSS = `
:root {
  --naiwa-yellow: #ffc83d;
  --naiwa-yellow-deep: #f0a800;
  --naiwa-cream: #fff7e2;
  --naiwa-ink: #3a2a08;
}

/* ---------- 主题：把宿主的面板刷成半透明，露出奶油底纹 ----------
 * DSH 的所有表面都吃 --dsw-alias-bg-* 这组 token，改 token 比逐个选择器覆盖稳。
 * 底图铺在 body 上，面板留 8~15% 的透明，既看得到壁纸又不影响正文可读性。
 */
html, body, #root { background: transparent !important; }
/* 把桌宠的游玩区放大一圈：他们的物理边界取自这一层的矩形，
   而 sprite 本身带 ~40px 透明边距，不放大就永远差一截贴不到窗口边。 */
body { background-color: #fffaf0 !important; }
/* 壁纸轮换层：两张图交叉淡入，比直接改 body 的 background-image 平滑 */
.naiwa-wall { position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: .92; transform: translateZ(0); will-change: transform; contain: strict;
  background-position: 50% 50%; background-size: cover; background-repeat: no-repeat;
  transition: opacity .3s ease; }
.naiwa-wall.is-flash { animation: naiwa-wall-in .5s ease; }
/* 正文区加一层很淡的奶油罩：壁纸透得出来，字也不至于糊在蛙脸上 */
.naiwa-veil::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(58% 46% at 52% 40%, rgba(255, 251, 240, .62), rgba(255, 251, 240, 0) 72%); }
@keyframes naiwa-wall-in { 0% { opacity: .55; } 100% { opacity: .78; } }

/* ---------- 背景：暖光 + 水泡 ---------- */
canvas.naiwa-pet { will-change: transform; contain: layout style; }
.naiwa-veil {
  position: fixed;
  inset: 0;
  z-index: 2147482000;
  pointer-events: none;
  overflow: hidden;
  opacity: 1;
  background:
    radial-gradient(120% 85% at 100% 100%, rgba(255, 186, 32, .22) 0%, rgba(255, 200, 61, 0) 52%),
    radial-gradient(105% 85% at 0% 0%, rgba(255, 226, 168, .26) 0%, rgba(255, 241, 214, 0) 58%),
    radial-gradient(90% 70% at 50% 120%, rgba(255, 208, 92, .12) 0%, rgba(255, 208, 92, 0) 60%);
}
.naiwa-orb {
  position: absolute;
  bottom: -80px;
  left: var(--x, 50%);
  width: var(--s, 18px);
  height: var(--s, 18px);
  border-radius: 50%;
  background: radial-gradient(circle at 30% 28%, rgba(255,255,255,.95), rgba(255,255,255,.18) 62%, rgba(255,214,120,.28));
  will-change: transform;
  animation: naiwa-rise var(--d, 18s) linear var(--delay, 0s) infinite;
  opacity: .8;
}
body.naiwa-dragging .naiwa-orb { animation-play-state: paused !important; }
@keyframes naiwa-rise {
  0%   { transform: translate3d(0, 0, 0) scale(.8); opacity: 0; }
  10%  { opacity: .85; }
  50%  { transform: translate3d(var(--sway, 18px), -46vh, 0) scale(1); }
  90%  { opacity: .6; }
  100% { transform: translate3d(calc(var(--sway, 18px) * -1), -105vh, 0) scale(1.25); opacity: 0; }
}

/* ---------- 启动动画 ---------- */
.naiwa-splash {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: grid;
  place-items: center;
  background:
    radial-gradient(72% 58% at 50% 112%, #ffd572 0%, #ffeec2 44%, #fffaf0 76%, #fffdf8 100%),
    radial-gradient(46% 42% at 16% 6%, rgba(255, 209, 108, .5), transparent 72%),
    radial-gradient(42% 38% at 88% 14%, rgba(255, 226, 160, .45), transparent 74%),
    #fffaf0;
  animation: naiwa-splash-in .5s ease both;
  cursor: pointer;
  user-select: none;
}
.naiwa-splash.is-leaving { animation: naiwa-splash-out .55s ease forwards; pointer-events: none; }
@keyframes naiwa-splash-in  { from { opacity: 0 } to { opacity: 1 } }
@keyframes naiwa-splash-out { to { opacity: 0; transform: scale(1.03); visibility: hidden } }

.naiwa-rain {
  position: absolute;
  inset: -10% -10%;
  background-image: repeating-linear-gradient(102deg, rgba(255,255,255,.65) 0 1.5px, transparent 1.5px 9px);
  opacity: .5;
  animation: naiwa-rain-fall .55s linear infinite;
  -webkit-mask-image: radial-gradient(70% 60% at 50% 40%, #000 20%, transparent 78%);
  mask-image: radial-gradient(70% 60% at 50% 40%, #000 20%, transparent 78%);
}
@keyframes naiwa-rain-fall { from { transform: translate3d(0,0,0) } to { transform: translate3d(-18px, 44px, 0) } }

.naiwa-splash-inner {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 24px;
}
.naiwa-splash-stage { position: relative; display: grid; place-items: center; }
.naiwa-splash-stage::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -4px;
  width: 58%;
  height: 16px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(172, 112, 6, .34), transparent 76%);
  filter: blur(3px);
  animation: naiwa-land-shadow .95s cubic-bezier(.19, 1.35, .38, 1) both;
}
@keyframes naiwa-land-shadow {
  0%   { opacity: 0; transform: translateX(-50%) scale(.2) }
  55%  { opacity: .9; transform: translateX(-50%) scale(1.14, .88) }
  75%  { opacity: .8; transform: translateX(-50%) scale(.94, 1.06) }
  100% { opacity: .72; transform: translateX(-50%) scale(1) }
}
.naiwa-splash-pet {
  width: min(46vw, 260px);
  filter: drop-shadow(0 22px 26px rgba(196, 132, 0, .32));
  animation: naiwa-drop .95s cubic-bezier(.19, 1.35, .38, 1) both;
}
@keyframes naiwa-drop {
  0%   { transform: translateY(-58vh) scale(.72, .92); opacity: 0 }
  55%  { transform: translateY(0) scale(1.06, .9); opacity: 1 }
  70%  { transform: translateY(-6%) scale(.96, 1.05) }
  85%  { transform: translateY(0) scale(1.02, .98) }
  100% { transform: translateY(0) scale(1) }
}
.naiwa-splash-title {
  margin-top: 10px;
  font: 800 clamp(34px, 6vw, 58px)/1 "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  letter-spacing: .16em;
  color: #4a3208;
  text-shadow: 0 3px 0 #ffe9b3, 0 10px 24px rgba(190, 130, 0, .28);
  animation: naiwa-fade-up .7s .35s ease both;
}
.naiwa-splash-sub {
  font: 500 14px/1.6 "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  letter-spacing: .22em;
  color: #9a7326;
  animation: naiwa-fade-up .7s .5s ease both;
}
.naiwa-splash-bar {
  margin-top: 14px;
  width: min(56vw, 240px);
  height: 5px;
  border-radius: 99px;
  background: rgba(214, 168, 58, .22);
  overflow: hidden;
  animation: naiwa-fade-up .7s .6s ease both;
}
.naiwa-splash-bar > i {
  display: block;
  height: 100%;
  width: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #ffd76a, #ffb01f);
  transform-origin: left center;
  animation: naiwa-bar 1.85s cubic-bezier(.4, 0, .2, 1) .25s both;
}
@keyframes naiwa-bar { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes naiwa-fade-up { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
.naiwa-splash-skip {
  position: fixed;
  left: 0;
  right: 0;
  bottom: max(24px, env(safe-area-inset-bottom));
  text-align: center;
  font: 400 12px/1 "PingFang SC", system-ui, sans-serif;
  letter-spacing: .18em;
  color: #b99a5c;
  animation: naiwa-fade-up .8s 1.1s ease both;
}

/* ---------- 桌宠 ---------- */
.naiwa-skin-pet {
  position: fixed;
  z-index: 2147482100;
  right: var(--naiwa-x, 22px);
  bottom: var(--naiwa-y, 18px);
  width: var(--naiwa-w, 124px);
  cursor: grab;
  touch-action: none;
  transform-origin: 50% 100%;
  animation: naiwa-breathe 4.2s ease-in-out infinite;
  will-change: transform;
  /* 反复点击时不要出现蓝色选中块 / 拖拽鬼影 */
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.naiwa-skin-pet.is-dragging { cursor: grabbing; animation: none; }
.naiwa-skin-pet.is-jump { animation: naiwa-jump .62s cubic-bezier(.3, 1.6, .5, 1); }
/* 按下 → 压扁；松开 → 回弹。用两层元素分开，避免和呼吸动画打架 */
.naiwa-skin-pet.is-squish { animation: naiwa-squish .46s cubic-bezier(.2, 1.5, .3, 1); }
@keyframes naiwa-squish {
  0%   { transform: scale(1, 1) }
  18%  { transform: scale(1.14, .84) }
  38%  { transform: scale(.93, 1.09) }
  58%  { transform: scale(1.05, .96) }
  76%  { transform: scale(.985, 1.02) }
  100% { transform: scale(1, 1) }
}
.naiwa-skin-pet img.naiwa-pet-img {
  display: block;
  width: 100%;
  height: auto;
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none;
  filter: drop-shadow(0 10px 14px rgba(150, 96, 0, .3));
  transform: rotate(var(--naiwa-tilt, 0deg)) translateX(var(--naiwa-lean, 0px));
  transition: transform .45s cubic-bezier(.2, .9, .3, 1.2);
}
.naiwa-skin-pet .naiwa-pet-shadow {
  position: absolute;
  left: 50%;
  bottom: -6px;
  width: 78%;
  height: 16px;
  transform: translateX(-50%);
  opacity: .28;
  pointer-events: none;
}
@keyframes naiwa-breathe {
  0%, 100% { transform: translateY(0) scale(1, 1) }
  50%      { transform: translateY(-4px) scale(.985, 1.015) }
}
@keyframes naiwa-jump {
  0%   { transform: translateY(0) scale(1) }
  28%  { transform: translateY(-26px) scale(.94, 1.07) }
  55%  { transform: translateY(-30px) scale(1.05, .95) }
  75%  { transform: translateY(0) scale(1.08, .9) }
  100% { transform: translateY(0) scale(1) }
}

.naiwa-skin-bubble {
  position: absolute;
  right: 78%;
  bottom: 62%;
  min-width: 92px;
  max-width: 216px;
  width: max-content;
  padding: 9px 12px;
  border-radius: 14px 14px 4px 14px;
  background: #fffdf5;
  color: #4a3208;
  font: 500 13px/1.55 "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  box-shadow: 0 8px 22px rgba(150, 100, 0, .18), 0 0 0 1px rgba(240, 190, 80, .5) inset;
  opacity: 0;
  transform: translateY(6px) scale(.94);
  transition: opacity .22s ease, transform .28s cubic-bezier(.2, 1.4, .4, 1);
  pointer-events: none;
  white-space: pre-wrap;
}
.naiwa-skin-bubble.is-on { opacity: 1; transform: none; }

/* ---------- 人物设定卡 ---------- */
.naiwa-card {
  position: fixed;
  z-index: 2147482500;
  left: 50%;
  top: 50%;
  width: min(90vw, 420px);
  max-height: 82vh;
  overflow: auto;
  transform: translate(-50%, -46%) scale(.96);
  opacity: 0;
  pointer-events: none;
  border-radius: 20px;
  background: linear-gradient(180deg, #fffdf6, #fff4d8);
  box-shadow: 0 30px 70px rgba(90, 60, 0, .28), 0 0 0 1px rgba(240, 190, 80, .45);
  font-family: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  transition: opacity .24s ease, transform .3s cubic-bezier(.2, 1.3, .4, 1);
  overflow-x: hidden;
}
.naiwa-card.is-on { opacity: 1; transform: translate(-50%, -50%) scale(1); pointer-events: auto; }
.naiwa-card-head { position: relative; }
.naiwa-card-face {
  display: block;
  width: 100%;
  height: 168px;
  object-fit: cover;
  object-position: 50% 34%;
  filter: saturate(1.05) contrast(1.02);
}
.naiwa-card-head::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 248, 230, 0) 40%, rgba(255, 247, 226, .96) 100%);
}
.naiwa-card-close {
  position: absolute;
  right: 10px;
  top: 10px;
  z-index: 2;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, .82);
  color: #6b4c10;
  font: 600 15px/1 system-ui, sans-serif;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(90, 60, 0, .18);
}
.naiwa-card-body { padding: 0 20px 20px; margin-top: -14px; position: relative; }
.naiwa-card-name {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: .08em;
  color: #3c2a06;
}
.naiwa-card-tagline { margin-top: 2px; font-size: 12px; letter-spacing: .18em; color: #a2813c; }
.naiwa-card-traits {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0 10px;
}
.naiwa-card-traits span {
  padding: 3px 9px;
  border-radius: 99px;
  background: rgba(255, 200, 61, .22);
  color: #7a5b12;
  font-size: 12px;
}
.naiwa-card-text {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.85;
  color: #4a3a16;
  white-space: pre-wrap;
}

/* ---------- 彩蛋花瓣 ---------- */
.naiwa-petal {
  position: fixed;
  z-index: 2147482200;
  width: 12px;
  height: 12px;
  border-radius: 60% 10% 60% 10%;
  background: linear-gradient(140deg, #ff6b6b, #c81e3a);
  pointer-events: none;
  animation: naiwa-petal-fall var(--dur, 2.4s) cubic-bezier(.3, .6, .4, 1) forwards;
}
@keyframes naiwa-petal-fall {
  0%   { transform: translate3d(0, 0, 0) rotate(0deg) scale(.6); opacity: 0 }
  15%  { opacity: 1 }
  100% { transform: translate3d(var(--dx, 40px), 60vh, 0) rotate(420deg) scale(1); opacity: 0 }
}

@media (max-width: 720px) {
  .naiwa-skin-pet { --naiwa-w: 88px; }
  .naiwa-skin-bubble { max-width: 168px; font-size: 12px; right: 84%; }
}
@media (prefers-reduced-motion: reduce) {
  .naiwa-skin-pet, .naiwa-skin-bubble, .naiwa-petal { animation: none !important; transition: none !important; }
}

/* 页内不再画蛙：桌宠交给 dsh-naiwa 插件（weikangzeng07-ops 的引擎），这里只保留节点复用台词气泡。 */
.naiwa-skin-pet { display: none !important; }
`

/** 读取上次拖动位置。 */
function readPos() {
  try {
    const raw = localStorage.getItem(LS_POS)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (typeof p?.x === 'number' && typeof p?.y === 'number') return p
  } catch {
    /* localStorage 不可用时忽略 */
  }
  return null
}

function savePos(x, y) {
  try {
    localStorage.setItem(LS_POS, JSON.stringify({ x, y }))
  } catch {
    /* 忽略 */
  }
}

function pickQuip(seed) {
  const i = Number.isFinite(seed) ? Math.abs(seed) % QUIPS.length : Math.floor(Math.random() * QUIPS.length)
  return QUIPS[i]
}

/**
 * 声音：不打包任何音频文件，用 WebAudio 现场合成。
 *  - croak：低频锯齿 + 快速下滑，再叠一层带通噪声当「喉音」
 *  - boop：轻快的正弦，用在拖动落地
 * 浏览器自动播放策略要求先有用户手势，ctx 在第一次点击时创建。
 */
function createVoice() {
  let ctx = null
  let muted = false
  try {
    muted = localStorage.getItem(LS_SOUND) === '0'
  } catch {
    /* 忽略 */
  }

  const ensure = () => {
    if (ctx) return ctx
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    try {
      ctx = new AC()
    } catch {
      ctx = null
    }
    return ctx
  }

  const noiseBurst = (ac, out, at, dur, freq, gain) => {
    const len = Math.max(1, Math.floor(ac.sampleRate * dur))
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i += 1) {
      const t = i / len
      data[i] = (Math.random() * 2 - 1) * (1 - t) ** 2
    }
    const src = ac.createBufferSource()
    src.buffer = buf
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = freq
    bp.Q.value = 2.6
    const g = ac.createGain()
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(gain, at + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0008, at + dur)
    src.connect(bp).connect(g).connect(out)
    src.start(at)
    src.stop(at + dur + 0.02)
  }

  /** 呱：音高先上后下，两段。 */
  const croak = (pitch = 1) => {
    if (muted) return
    const ac = ensure()
    if (!ac) return
    if (ac.state === 'suspended') ac.resume().catch(() => {})
    const at = ac.currentTime + 0.005
    const out = ac.createGain()
    out.gain.value = 0.22
    out.connect(ac.destination)

    const osc = ac.createOscillator()
    osc.type = 'sawtooth'
    const f0 = 168 * pitch
    osc.frequency.setValueAtTime(f0 * 0.72, at)
    osc.frequency.exponentialRampToValueAtTime(f0 * 1.18, at + 0.06)
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.62, at + 0.22)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(900, at)
    lp.frequency.exponentialRampToValueAtTime(420, at + 0.24)
    const g = ac.createGain()
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(0.9, at + 0.02)
    g.gain.setValueAtTime(0.75, at + 0.13)
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.28)
    osc.connect(lp).connect(g).connect(out)
    osc.start(at)
    osc.stop(at + 0.3)

    // 第二声更闷一点，像「呱—呱」
    const osc2 = ac.createOscillator()
    osc2.type = 'sawtooth'
    osc2.frequency.setValueAtTime(f0 * 0.58, at + 0.16)
    osc2.frequency.exponentialRampToValueAtTime(f0 * 0.42, at + 0.34)
    const g2 = ac.createGain()
    g2.gain.setValueAtTime(0, at + 0.16)
    g2.gain.linearRampToValueAtTime(0.55, at + 0.18)
    g2.gain.exponentialRampToValueAtTime(0.001, at + 0.4)
    osc2.connect(g2).connect(out)
    osc2.start(at + 0.16)
    osc2.stop(at + 0.42)

    noiseBurst(ac, out, at, 0.12, 1150 * pitch, 0.16)
  }

  /** 落地/弹一下：短促的 boing。 */
  const boop = (pitch = 1) => {
    if (muted) return
    const ac = ensure()
    if (!ac) return
    if (ac.state === 'suspended') ac.resume().catch(() => {})
    const at = ac.currentTime + 0.004
    const out = ac.createGain()
    out.gain.value = 0.10
    out.connect(ac.destination)
    const osc = ac.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(420 * pitch, at)
    osc.frequency.exponentialRampToValueAtTime(190 * pitch, at + 0.16)
    const g = ac.createGain()
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(1, at + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.2)
    osc.connect(g).connect(out)
    osc.start(at)
    osc.stop(at + 0.22)
  }

  return {
    croak,
    boop,
    get muted() {
      return muted
    },
    toggle() {
      muted = !muted
      try {
        localStorage.setItem(LS_SOUND, muted ? '0' : '1')
      } catch {
        /* 忽略 */
      }
      if (!muted) boop(1.1)
      return muted
    },
  }
}

/**
 * 把整套 UI 挂到文档上，返回卸载函数。
 * @returns {() => void}
 */
// 奶蛙工作室：把 dsh-naiwa-theme 的界面手感（标题/空状态文案/侧栏灵感池卡片/工作区图标）
// 搬到奶黄气泡这套皮肤上。全部是 DOM 注入，不依赖 React。
const STUDIO_WISDOMS = [
  '不要总是低头赶路。偶尔抬头看看，天花板有没有漏水。',
  '只要把问题放进冰箱，它就会变成冷知识。',
  '人生没有白走的路，但有走错以后还嘴硬的路。',
  '真正的自律，是在决定躺平以后，每天坚持躺平。',
  '当你觉得自己一无所有，至少你还有点饿。',
  '不要害怕走得慢。只要方向够随意，哪里都是顺路。',
  '水到渠成的前提是，先确认自己没有站在漏勺里。',
  '生活给了你柠檬，就问问奶茶店能不能代加工。',
  '与其内耗自己，不如外耗一块充电宝。',
  '心态放平，烦恼就会从圆的变成扁的。',
  '所谓成熟，就是香蕉已经有了自己的斑点。',
  '越是没有答案的时候，越要看看是不是忘了翻面。',
  '机会总是留给有准备的人，椅子留给先坐下的人。',
  '不要和时间赛跑，时间没有报名费，你有。',
  '人生如茶，最重要的是别把杯盖当饼干。',
  '如果生活没有给你回声，试试把麦克风打开。',
  '所有努力都会有回报，比如努力关灯，电费就会少一点。',
  '你要允许万物穿过自己，除了蚊子。',
  '站得高才能看得远，但坐下来比较不累。',
  '世上没有过不去的坎，只有过去以后又想起来的坎。',
  '放下执念的第一步，是先放下手里的遥控器。',
  '不要为昨天后悔。昨天的外卖，今天已经不能退了。',
  '一切皆有可能，尤其是你忘记自己来厨房干什么。',
  '懂得留白的人，通常还没有开始写。',
  '与其追求完美，不如先确认保存按钮在哪里。',
  '保持空杯心态，但记得先把奶茶喝完。',
  '风会带来答案，也会把你的发型带走。',
  '人不能总活在过去，冰箱里的蛋糕可以。',
  '当一扇门关上时，先看看是不是推拉方向反了。',
  '所有相遇都有意义，比如你和桌角。',
  '欲速则不达，除非是快递选了次日达。',
  '生活不止眼前的苟且，还有不知道放哪儿的充电线。',
  '先完成，再完美。先把这句念完，今天也算完成了一件事。',
  '别让情绪左右你，让转椅左右你。',
  '真正的松弛感，是橡皮筋已经找不到工作了。',
  '每个人都有自己的时区，奶蛙有自己的摸鱼区。'
]

/* 样式全部抄自 dsh-plugin-naiwa-theme 的 .nw-inspiration-anchor / .np-dialog /
   .nw-wisdom-scene，以及 dsh-naiwa-theme 的发送按钮规则，只把变量换成字面值。 */
const STUDIO_CSS = `
.nw-inspiration-anchor{position:relative;box-sizing:border-box;display:flex;align-items:center;flex:0 0 auto;min-height:85px;margin:9px 12px 16px 2px;padding:15px 80px 15px 15px;overflow:hidden;border:1px solid rgba(255,255,255,.14);border-radius:17px;background:linear-gradient(150deg,var(--naiwa-glass-a,rgba(20,28,26,.62)),var(--naiwa-glass-b,rgba(10,16,15,.50)));-webkit-backdrop-filter:blur(var(--naiwa-glass-blur,18px)) saturate(1.3);backdrop-filter:blur(var(--naiwa-glass-blur,18px)) saturate(1.3);color:#e8f3ee;text-align:left;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.10),0 10px 26px rgba(0,0,0,.24);transition:border-color .2s,box-shadow .2s;font-family:'PingFang SC',sans-serif}
.nw-inspiration-anchor:hover{border-color:rgba(127,240,216,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 0 0 1px rgba(127,240,216,.20),0 12px 30px rgba(0,0,0,.30)}
.nw-inspiration-anchor:focus-visible{outline:2px solid rgba(127,240,216,.7);outline-offset:3px}
.nw-inspiration-anchor strong{display:block;font:600 12px/1.7 'PingFang SC',sans-serif;letter-spacing:.04em;color:#eef7f2}
.nw-inspiration-anchor small{display:inline-block;font:10px/1.8 'PingFang SC',sans-serif;color:rgba(232,243,238,.62);margin-top:5px;white-space:nowrap;vertical-align:middle}
.nw-inspiration-anchor img{position:absolute;width:87px;height:87px;object-fit:contain;bottom:-12px;right:5px;pointer-events:none;transition:transform .2s;filter:drop-shadow(0 6px 14px rgba(0,0,0,.35))}
.nw-inspiration-anchor:hover img{transform:translateY(-3px) rotate(3deg)}

.nw-wallentry{display:inline-flex;align-items:center;gap:4px;margin:5px 0 0 7px;padding:3px 8px 3px 7px;border:1px dashed rgba(127,240,216,.55);border-radius:9px;background:rgba(127,240,216,.10);color:#9ff2df;font:500 9px/1 'PingFang SC',sans-serif;letter-spacing:.06em;cursor:pointer;vertical-align:middle;transition:background .16s ease,border-color .16s ease,color .16s ease}
.nw-wallentry:hover{background:rgba(127,240,216,.18);border-color:#7ff0d8;border-style:solid;color:#d7fff5}
.nw-wallentry svg{width:9px;height:9px;display:block}
.naiwa-up-qp{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;min-height:52px;margin:0 0 8px;border:1.5px dashed rgba(127,240,216,.7);border-radius:12px;background:rgba(127,240,216,.10);color:#a7f5e4;font:500 12px/1 'PingFang SC','Microsoft YaHei',sans-serif;letter-spacing:.08em;cursor:pointer;transition:background .16s ease,border-color .16s ease}
.naiwa-up-qp:hover{background:rgba(127,240,216,.18);border-color:#7ff0d8}
.naiwa-up-qp svg{width:14px;height:14px;display:block}
/* 浮在抽屉右上角：不参与列表布局，不会和他们的重排/滚动打架 */
.naiwa-up-qp--float{position:absolute;right:16px;top:86px;z-index:6;width:auto;min-height:32px;margin:0;padding:0 12px;gap:5px;font-size:11px;border-radius:999px;background:rgba(127,240,216,.14);box-shadow:0 6px 18px rgba(0,0,0,.35)}
.naiwa-up-qp--float span{display:inline}
/* 鲸鱼娘吉祥物：只在视觉上隐藏，节点保留——它是侧边壁纸抽屉的开关 */
.we-rope{opacity:0!important;pointer-events:none!important}
/* 壁纸与配色交给 dsh-plugin-wallpaper-engine 后，别再叠自家暖光罩 + 居中奶油高光 */
.naiwa-veil{display:none!important}
.naiwa-wall{display:none!important}
/* dsh-naiwa 的普通台词气泡（.naiwa-bubble）整块隐藏，只保留记账气泡 .naiwa-abubble */
.naiwa-bubble{display:none!important}
.np-modal-mask{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;background:#17241f66;backdrop-filter:blur(4px);animation:nw-mask-in .18s ease both}
.np-dialog{--np-ink:#35432f;--np-paper:#fffdf2;display:flex;flex-direction:column;width:min(680px,100%);max-height:calc(100dvh - 40px);background:var(--np-paper);color:var(--np-ink);border:1px solid #a4a88d55;border-radius:22px;box-shadow:0 30px 100px #12221b55;overflow:hidden;font-family:-apple-system,'PingFang SC',sans-serif;animation:nw-dialog-in .22s cubic-bezier(.22,1,.36,1) both}
.np-dialog-header{display:flex;flex:0 0 auto;align-items:center;justify-content:space-between;gap:15px;padding:18px 24px;border-bottom:1px solid rgba(53,67,47,.12)}
.np-dialog-header small{font-size:8px;letter-spacing:.18em;opacity:.6}
.np-dialog-header h2{margin:5px 0 0;font:600 22px/1.4 'Songti SC',serif;letter-spacing:.04em;color:#526641}
.nw-close-button{box-sizing:border-box;display:inline-grid;place-items:center;width:32px;height:32px;padding:0;border:0;border-radius:9px;background:transparent;color:#35432f;cursor:pointer}
.nw-close-button svg{display:block;width:16px;height:16px}
.nw-close-button:hover{background:rgba(53,67,47,.07)}
.nw-wisdom-scene{position:relative;padding:26px 28px 20px;overflow:hidden;background:radial-gradient(ellipse at 0 100%,#dee9c46b,transparent 65%)}
.nw-mini-tag{display:inline-block;align-self:flex-start;white-space:nowrap;padding:4px 8px;border-radius:7px;color:#87916d;background:#edf1df;font-size:9px;line-height:1.4;letter-spacing:.04em}
.nw-wisdom-scene blockquote{position:relative;margin:25px 0 20px;min-height:95px;color:#526841;font:500 clamp(20px,2.5vw,27px)/1.9 'Songti SC','Noto Serif CJK SC',serif;letter-spacing:.04em;animation:nw-quote-arrive .35s ease both}
.nw-wisdom-scene>p{font-size:10px;color:#a0a489;margin:0 0 20px}
.nw-wisdom-bottom{display:flex;align-items:center;gap:10px;border-top:1px solid #a5b88a33;padding-top:14px}
.nw-wisdom-bottom img{width:50px;height:60px;object-fit:contain}
.nw-wisdom-bottom span{flex:1;color:#98a184;font-size:10px}
.nw-button{min-width:112px;padding:11px 18px;border-radius:11px;border:1px solid #afbe924d;background:#fafbf1;color:#647a4e;font-size:11px;cursor:pointer;font-family:inherit}
.nw-button:hover:not(:disabled){background:#eaf0dd;border-color:#a3b78380}
.nw-button.nw-ghost{min-width:auto;padding:9px 13px;font-size:10px;color:#8a9a72}
.nw-primary{background:#789459;border-color:#789459;color:#fffef1}
.nw-primary:hover:not(:disabled){background:#69854c;color:#fffef1}
.naiwa-studio-ws-icon{width:16px;height:16px;border-radius:5px;object-fit:cover;display:inline-block;vertical-align:-3px;margin-right:6px}
[data-composer-card] button[aria-label='停止生成'],
[data-composer-card] button[aria-label='Stop generating'],
[data-composer-card] button[aria-label='停止'],
[data-composer-card] button[aria-label='Stop']{border:2px solid rgba(111,142,69,.42);background-color:#789459;color:#fffef1;box-shadow:0 3px 9px rgba(39,50,25,.22);transition:transform 150ms ease,box-shadow 150ms ease,background-color 150ms ease}
[data-composer-card] button[aria-label='停止生成']:hover,
[data-composer-card] button[aria-label='Stop generating']:hover,
[data-composer-card] button[aria-label='停止']:hover,
[data-composer-card] button[aria-label='Stop']:hover{background-color:#68823d;transform:translateY(-2px) scale(1.06)}
.naiwa-walldock{position:fixed;right:30px;bottom:190px;z-index:2147482900;display:block;pointer-events:none;transition:left .18s ease,top .18s ease}
.naiwa-walldock>*{pointer-events:auto}
.naiwa-walldock-handle{width:26px;height:26px;padding:0;border:2px solid rgba(255,252,242,.92);border-radius:50%;background:#f4c927;box-shadow:0 4px 12px rgba(96,124,55,.28);cursor:pointer;overflow:hidden;transition:transform .16s ease,box-shadow .16s ease;display:flex;align-items:center;justify-content:center}
.naiwa-walldock-handle:hover{transform:scale(1.1);box-shadow:0 8px 20px rgba(96,124,55,.34)}
.naiwa-walldock-handle img{width:100%;height:100%;object-fit:cover;display:block}
.naiwa-wallpanel{position:absolute;bottom:calc(100% + 10px);right:0;width:322px;max-height:0;overflow:hidden;opacity:0;transform:translateY(8px);transition:opacity .2s ease,transform .2s ease,max-height .24s ease;border:1px solid #a4a88d55;border-radius:18px;background:#fffdf2;box-shadow:0 24px 60px rgba(24,40,26,.20)}
.naiwa-wallpanel.is-open{max-height:420px;opacity:1;transform:translateY(0)}
.naiwa-wallpanel header{display:flex;align-items:baseline;gap:9px;padding:14px 16px 10px;border-bottom:1px solid rgba(53,67,47,.10)}
.naiwa-wallpanel header strong{font:600 13px/1.4 'PingFang SC',sans-serif;color:#35432f}
.naiwa-wallpanel header small{font-size:10px;color:#98a184}
.naiwa-wallpanel-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;padding:13px 16px;max-height:270px;overflow:auto}
.naiwa-wallpanel-cell{padding:0;border:1px solid #a5b88a3d;border-radius:11px;overflow:hidden;background:#f7f8ec;cursor:pointer;aspect-ratio:16/10;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}
.naiwa-wallpanel-cell img{width:100%;height:100%;object-fit:cover;display:block}
.naiwa-wallpanel-cell:hover{transform:translateY(-2px);border-color:#9db67b;box-shadow:0 6px 16px rgba(97,124,55,.18)}
.naiwa-wallpanel-cell.is-active{border-color:#789459;box-shadow:0 0 0 2px rgba(120,148,89,.28)}
.naiwa-wallpanel-empty{margin:0;padding:18px 4px;color:#9ba18b;font-size:11px;text-align:center}
.naiwa-wallpanel footer{display:flex;align-items:center;gap:8px;padding:11px 16px 14px;border-top:1px solid rgba(53,67,47,.10)}
.naiwa-wallpanel footer button,.naiwa-wallpanel footer .up{padding:8px 13px;border-radius:10px;border:1px solid #afbe924d;background:#fafbf1;color:#647a4e;font:500 11px/1 'PingFang SC',sans-serif;cursor:pointer}
.naiwa-wallpanel footer .pick{background:#789459;border-color:#789459;color:#fffef1}
.naiwa-wallpanel footer .hint{flex:1;text-align:right;font-size:10px;color:#a0a489}
@keyframes nw-quote-arrive{from{opacity:0;transform:translateY(7px)}}
@keyframes nw-mask-in{from{opacity:0}}
@keyframes nw-dialog-in{from{opacity:0;transform:translateY(10px) scale(.985)}}
`

const STUDIO_SEND_CSS = `
[data-composer-card] button[aria-label='发送消息'],
[data-composer-card] button[aria-label='Send message']{border:2px solid rgba(111,142,69,.42)!important;background-color:#f4c927!important;background-image:var(--naiwa-theme-head-button)!important;background-position:center!important;background-repeat:no-repeat!important;background-size:112%!important;box-shadow:0 3px 9px rgba(39,50,25,.22)!important;color:transparent!important;overflow:hidden;transform:translateZ(0);transition:transform 150ms ease,box-shadow 150ms ease,border-color 150ms ease}
[data-composer-card] button[aria-label='发送消息']>svg,
[data-composer-card] button[aria-label='Send message']>svg{opacity:0}
[data-composer-card] button[aria-label='发送消息']:hover:not(:disabled),
[data-composer-card] button[aria-label='Send message']:hover:not(:disabled),
[data-composer-card] button[aria-label='发送消息']:focus-visible,
[data-composer-card] button[aria-label='Send message']:focus-visible{border-color:rgba(241,201,54,.95)!important;background-size:118%!important;box-shadow:0 5px 13px rgba(39,50,25,.30)!important;transform:translateY(-2px) scale(1.06)}
[data-composer-card] button[aria-label='发送消息']:focus-visible,
[data-composer-card] button[aria-label='Send message']:focus-visible{outline:2px solid #d9ad00;outline-offset:3px}
[data-composer-card] button[aria-label='发送消息']:disabled,
[data-composer-card] button[aria-label='Send message']:disabled{filter:grayscale(.35)}
`

/* 和 dsh-naiwa-theme 一样的播放器：Audio + AudioContext 解码，首帧不卡。 */
function createStudioAudio(dataUri, volume) {
  const audio = new Audio(dataUri)
  audio.preload = 'auto'
  audio.volume = volume
  let disposed = false
  let audioContext = null
  let bufferPromise = null
  let source = null
  const fallback = () => {
    audio.currentTime = 0
    const result = audio.play()
    result?.catch?.(() => {})
  }
  const unlock = () => {
    if (audioContext !== null) {
      void audioContext.resume()
      return
    }
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
    if (AudioContextClass === undefined) return
    audioContext = new AudioContextClass()
    void audioContext.resume()
    bufferPromise = fetch(dataUri)
      .then((response) => response.arrayBuffer())
      .then((buffer) => audioContext.decodeAudioData(buffer))
  }
  document.addEventListener('pointerdown', unlock, { capture: true, passive: true })
  return {
    play() {
      if (audioContext === null || bufferPromise === null) {
        fallback()
        return
      }
      void audioContext.resume()
      bufferPromise
        .then((buffer) => {
          if (disposed) return
          try { source?.stop() } catch { /* 忽略 */ }
          source = audioContext.createBufferSource()
          source.buffer = buffer
          source.connect(audioContext.destination)
          source.start()
        })
        .catch(fallback)
    },
    dispose() {
      disposed = true
      document.removeEventListener('pointerdown', unlock, true)
      try { source?.stop() } catch { /* 忽略 */ }
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      if (audioContext !== null) void audioContext.close()
    }
  }
}

function installStudioChrome(ctx) {
  const WALL_CSS = `
.naiwa-wallpanel{position:fixed;left:50%;top:50%;z-index:2147483300;width:min(600px,88vw);
  height:min(540px,74vh);display:flex;flex-direction:column;
  opacity:0;visibility:hidden;pointer-events:none;transform:translate(-50%,-50%) scale(.97);
  background:linear-gradient(180deg,#fffef7,#fbfaea);border:1px solid #a5b88a52;border-radius:18px;
  box-shadow:0 32px 88px rgba(58,72,44,.26);transition:opacity .18s ease,transform .18s ease}
.naiwa-wallpanel.is-open{opacity:1;visibility:visible;pointer-events:auto;transform:translate(-50%,-50%) scale(1)}
.naiwa-wallpanel header{flex:0 0 auto;display:flex;align-items:baseline;gap:10px;padding:18px 22px 12px;border-bottom:1px solid rgba(53,67,47,.10)}
.naiwa-wallpanel header strong{font:600 15px/1.4 'PingFang SC','Microsoft YaHei',sans-serif;color:#35432f}
.naiwa-wallpanel header small{font-size:11px;color:#98a184}
.naiwa-wallpanel .naiwa-wallclose{margin-left:auto;width:30px;height:30px;padding:0;border:1px solid #a5b88a4d;
  border-radius:9px;background:#fffef6;color:#6d7d5c;font-size:15px;line-height:1;cursor:pointer}
.naiwa-wallpanel .naiwa-wallclose:hover{background:#f1f4e6}
.naiwa-wallpanel-grid{flex:1 1 auto;display:grid;grid-template-columns:repeat(3,1fr);align-content:start;gap:12px;padding:16px 22px;overflow:auto}
.naiwa-wallpanel-cell{position:relative;padding:0;border:1px solid #a5b88a3d;border-radius:12px;overflow:hidden;background:#f7f8ec;cursor:pointer;
  cursor:pointer;aspect-ratio:16/10;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease}
.naiwa-wallpanel-cell img{width:100%;height:100%;object-fit:cover;display:block}
.naiwa-wallpanel-cell:hover{transform:translateY(-2px);border-color:#9db67b;box-shadow:0 8px 18px rgba(97,124,55,.18)}
.naiwa-walldel{position:absolute;top:6px;right:6px;width:21px;height:21px;padding:0;border:0;border-radius:50%;background:rgba(24,36,26,.46);color:#fffdf2;font:400 13px/1 system-ui;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:.62;transform:scale(.94);transition:opacity .16s ease,transform .16s ease,background .16s ease;backdrop-filter:blur(2px)}
.naiwa-wallpanel-cell:hover .naiwa-walldel,.naiwa-walldel:focus-visible{opacity:1;transform:scale(1)}
.naiwa-walldel:hover{background:#c0533f}
/* 壁纸做「纹理化」：模糊 + 奶油薄纱，照片感弱了，文字才压得住 */
.naiwa-wall{filter:blur(2px) saturate(.92);opacity:.72}
.naiwa-wall::after{content:'';position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 40%,rgba(255,250,240,.30),rgba(255,246,226,.52))}
/* 观影模式：深色玻璃 + 亮字，壁纸几乎不压 */
html[data-naiwa-mode="dark"] body,
html[data-naiwa-mode="dark"] [class*="_centerCol"],
html[data-naiwa-mode="dark"] [class*="_sidebarCol"]{color:#f1ecdf}
html[data-naiwa-mode="dark"] [class*="_sidebarCol"]{background:rgba(20,23,20,.72)!important}
html[data-naiwa-mode="dark"] [class*="_sidebarCol"] :is(span,div,a,strong,small,label){color:#ece6d8!important}
/* 浅底胶囊按钮（新会话）里要保留深字，否则浅字压在奶油底上看不见 */
html[data-naiwa-mode="dark"] [class*="_sidebarCol"] button:has(span[class*="newSession"]) :is(span,div){color:#2b2418!important}
html[data-naiwa-mode="dark"] [class*="_centerCol"] :is(p,h1,h2,h3,h4,li):not(button *){color:#ece6d8!important}
html[data-naiwa-mode="dark"] [role="dialog"] :is(p,h1,h2,h3,h4,li,strong,small):not(button *),
html[data-naiwa-mode="dark"] [class*="_dialog"] :is(p,h1,h2,h3,h4,li,strong,small):not(button *){color:#e6e0d2!important}
html[data-naiwa-mode="dark"] [class*="_sidebarCol"] :is(kbd){color:#b9b3a3!important}
html[data-naiwa-mode="dark"] [data-composer-card]{background:rgba(26,30,26,.80)!important;border-color:rgba(255,236,190,.18)!important}
html[data-naiwa-mode="dark"] [data-composer-card] textarea,
html[data-naiwa-mode="dark"] [data-composer-card] input{color:#f6f1e4!important;caret-color:#f0c530}
html[data-naiwa-mode="dark"] .naiwa-wall{opacity:.9;filter:blur(1px) saturate(.96)}
html[data-naiwa-mode="dark"] .naiwa-wall::after{background:radial-gradient(120% 90% at 50% 40%,rgba(8,12,10,.20),rgba(8,10,9,.44))}
html[data-naiwa-mode="dark"] .naiwa-wallpanel,
html[data-naiwa-mode="dark"] .nw-inspiration-anchor{background:linear-gradient(150deg,rgba(18,24,22,.72),rgba(8,12,11,.60))!important;color:#e8f3ee!important}
html[data-naiwa-mode="dark"] .naiwa-wallpanel header strong,
html[data-naiwa-mode="dark"] .naiwa-wallpanel .hint{color:#f1ecdf!important}
.naiwa-wallpanel-cell.is-busy{opacity:.45;pointer-events:none}
.naiwa-wallpanel-cell.is-active{border-color:#789459;box-shadow:0 0 0 2px rgba(120,148,89,.30)}
.naiwa-wallpanel-empty{margin:0;padding:20px 4px;color:#9ba18b;font-size:12px;text-align:center}
.naiwa-wallpanel footer{flex:0 0 auto;display:flex;align-items:center;gap:9px;padding:13px 22px 16px;border-top:1px solid rgba(53,67,47,.10)}
.naiwa-wallpanel footer button,.naiwa-wallpanel footer .up{padding:8px 14px;border-radius:10px;border:1px solid #afbe924d;
  background:#fafbf1;color:#647a4e;font:500 12px/1.2 'PingFang SC','Microsoft YaHei',sans-serif;cursor:pointer}
.naiwa-wallpanel footer .pick{background:#789459;border-color:#789459;color:#fffef1}
.naiwa-wallpanel footer .hint{flex:1;text-align:right;font-size:11px;color:#a0a489}
.naiwa-wallmask{position:fixed;inset:0;z-index:2147483200;background:#17241f42;backdrop-filter:blur(3px);
  opacity:0;pointer-events:none;transition:opacity .18s ease}
.naiwa-wallmask.is-open{opacity:1;pointer-events:auto}
`
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-naiwa-studio'
  style.textContent = STUDIO_CSS + STUDIO_SEND_CSS + `:root{--naiwa-theme-head-button:url("${HEAD_BUTTON_SRC}")}` + WALL_CSS
  document.head.appendChild(style)

  const originalTitle = document.title
  document.title = '奶蛙 Harness'

  // 「发出去」的音效：和他们一样，监听会话从空闲变运行，而不是监听按钮点击。
  const sendPlayer = createStudioAudio(SEND_SOUND_SRC, 0.52)
  let unsubscribe = () => {}
  try {
    const list = ctx?.sessions?.list
  try {
    document.documentElement.dataset.naiwaSessions = list === undefined ? 'missing' : 'ok'
  } catch { /* 忽略 */ }
    if (list && typeof list.subscribe === 'function') {
      const running = new Map()
      const remember = (snapshot) => {
        for (const id of snapshot.ids) running.set(id, snapshot.byId[id]?.running === true)
      }
      remember(list.getSnapshot())
      unsubscribe = list.subscribe(() => {
        const snapshot = list.getSnapshot()
        let started = false
        for (const id of snapshot.ids) {
          const row = snapshot.byId[id]
          if (row === undefined || row.origin === 'subagent') continue
          if (running.get(id) !== true && row.running === true) started = true
        }
        remember(snapshot)
        if (started) sendPlayer.play()
      })
    }
  } catch { /* 老版本没有 sessions 服务 */ }

  let mask = null

  const closeWisdom = () => {
    if (mask === null) return
    mask.remove()
    mask = null
    document.removeEventListener('keydown', onKey, true)
  }

  const onKey = (event) => {
    if (event.key === 'Escape') closeWisdom()
  }

  const openWisdom = () => {
    closeWisdom()
    mask = document.createElement('div')
    mask.className = 'np-modal-mask'
    const dialog = document.createElement('section')
    dialog.className = 'np-dialog'
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    dialog.setAttribute('aria-label', '奶蛙灵感池')
    dialog.innerHTML = `
      <header class="np-dialog-header">
        <div>
          <small>MILK FROG · LITTLE WISDOM</small>
          <h2>奶蛙灵感池</h2>
        </div>
        <button type="button" class="nw-close-button" aria-label="关闭灵感池">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
      </header>
      <div class="nw-wisdom-scene">
        <span class="nw-mini-tag">奶蛙不完全研究所</span>
        <blockquote role="status"></blockquote>
        <p>听懂了也没关系，奶蛙也没懂。</p>
        <div class="nw-wisdom-bottom">
          <img alt="" src="${IDLE_SRC}">
          <span>认真摸鱼，随缘顿悟。</span>
          <button type="button" class="nw-button nw-ghost">上传壁纸</button>
          <button type="button" class="nw-button nw-primary">再来一句</button>
        </div>
      </div>`
    const quote = dialog.querySelector('blockquote')
    let index = Math.floor(Math.random() * STUDIO_WISDOMS.length)
    const nextQuote = () => {
      quote.textContent = STUDIO_WISDOMS[index % STUDIO_WISDOMS.length]
      quote.style.animation = 'none'
      void quote.offsetWidth
      quote.style.animation = ''
      index += 1
    }
    nextQuote()
    dialog.querySelector('.nw-button.nw-primary').addEventListener('click', nextQuote)
    dialog.querySelector('.nw-button.nw-ghost').addEventListener('click', () => {
      closeWisdom()
      uploadWallpapers()
      if (typeof WALL_OPEN === 'function') WALL_OPEN()
    })
    dialog.querySelector('.nw-close-button').addEventListener('click', closeWisdom)
    mask.addEventListener('pointerdown', (event) => {
      if (event.target === mask) closeWisdom()
    })
    mask.appendChild(dialog)
    document.body.appendChild(mask)
    document.addEventListener('keydown', onKey, true)
    dialog.querySelector('.nw-close-button').focus({ preventScroll: true })
  }

  // 侧栏「灵感池」卡片：和奶蛙美术馆同一个挂点、同一套样式
  const anchor = document.createElement('button')
  anchor.type = 'button'
  anchor.className = 'nw-inspiration-anchor'
  anchor.setAttribute('aria-label', '奶蛙灵感池，听一句歪道理')
  anchor.innerHTML = `
    <span class="nw-anchor-text">
      <strong>奶蛙灵感池</strong><br>
      <small>点一下，听句歪道理</small><span class="nw-wallentry" role="button" tabindex="0" aria-label="打开壁纸库"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m3 15 4.5-4.5 4 4L16 10l5 5"/></svg>壁纸库</span>
    </span>
    <img alt="" src="${IDLE_SRC}">`
  anchor.addEventListener('click', (event) => {
    if (event.target.closest('.nw-wallentry')) { openWall(); return }
    openWisdom()
  })
  const entryBtn = anchor.querySelector('.nw-wallentry')
  // 壁纸库在后面的块里才初始化，这里先留个句柄
  const openWall = () => {
    // 壁纸交给 dsh-plugin-wallpaper-engine 之后，入口优先打开它的面板
    if (WALL_OWNED_ELSEWHERE && (toggleWallpaperDrawer() || openWallpaperEnginePanel())) return
    if (typeof WALL_OPEN === 'function') WALL_OPEN()
  }
  entryBtn.addEventListener('click', (event) => {
    event.stopPropagation()
    openWall()
  })
  entryBtn.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    event.stopPropagation()
    openWall()
  })

  const mountAnchor = () => {
    if (anchor.isConnected) return
    const region = document.querySelector('[class*="_sidebarCol"] [class*="_regionArea"]')
    if (region) region.prepend(anchor)
  }

  // 「工作区」标题前加一枚奶蛙头像
  const decorateWorkspace = () => {
    const nodes = document.querySelectorAll('span,div,h2,h3,button')
    for (const node of nodes) {
      if (node.dataset.naiwaStudioWs === '1') continue
      if (node.children.length > 0) continue
      if ((node.textContent ?? '').trim() !== '工作区') continue
      const icon = document.createElement('img')
      icon.className = 'naiwa-studio-ws-icon'
      icon.alt = ''
      icon.src = AVATAR_SRC
      node.dataset.naiwaStudioWs = '1'
      node.prepend(icon)
    }
  }

  // 跟随 dsh-plugin-wallpaper-engine 的玻璃配方（颜色 / 透明度 / 雾化）
  const hexToRgb = (hex) => {
    const v = String(hex || '').replace('#', '').trim()
    if (v.length !== 6) return null
    const n = parseInt(v, 16)
    if (Number.isNaN(n)) return null
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
  }
  const applyEngineGlass = (cfg) => {
    if (!cfg) return
    const pair = cfg.glassColor || {}
    const dark = document.documentElement.dataset.naiwaMode === 'dark'
      || document.documentElement.classList.contains('dark')
    const hex = (dark ? (pair.dark || pair.light) : (pair.light || pair.dark)) || '#67DCE7'
    const rgb = hexToRgb(hex)
    if (!rgb) return
    const a = Math.min(.92, Math.max(.06, (Number(cfg.glassAlpha) || 40) / 100))
    const root = document.documentElement
    root.style.setProperty('--naiwa-glass-a', 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + a.toFixed(3) + ')')
    root.style.setProperty('--naiwa-glass-b', 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + Math.max(.04, a * .72).toFixed(3) + ')')
    const solid = Math.min(.96, Math.max(.62, a + .38))
    root.style.setProperty('--naiwa-glass-solid-a', 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + solid.toFixed(3) + ')')
    root.style.setProperty('--naiwa-glass-solid-b', 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + Math.max(.5, solid - .08).toFixed(3) + ')')
    const blur = Number(cfg.blur)
    if (Number.isFinite(blur)) root.style.setProperty('--naiwa-glass-blur', blur + 'px')
  }
  const syncGlass = async () => {
    try {
      const res = await fetch('/wallpaper-engine/settings', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      applyEngineGlass(data && data.settings)
    } catch (e) { /* 插件没装就不管 */ }
  }
  syncGlass()
  const glassTimer = setInterval(syncGlass, 4000)

  const scan = () => {
    if (document.title !== '奶蛙 Harness') document.title = '奶蛙 Harness'
    mountAnchor()
    decorateWorkspace()
  }
  scan()
const observer = new MutationObserver(scan)
  observer.observe(document.body, { childList: true, subtree: true })

  return () => {
    clearInterval(glassTimer)
    observer.disconnect()
    closeWisdom()
    unsubscribe()
    sendPlayer.dispose()
    anchor.remove()
    style.remove()
    document.title = originalTitle
    document.querySelectorAll('[data-naiwa-studio-ws="1"]').forEach((node) => {
      node.removeAttribute('data-naiwa-studio-ws')
      const icon = node.querySelector('.naiwa-studio-ws-icon')
      if (icon) icon.remove()
    })
  }
}


// 打开 dsh-plugin-wallpaper-engine 的壁纸面板：官方没有公开的可编程入口，
// 走它自己用的两步 DOM 路径 —— 点左栏底部「设置」，再点 nav 里的「壁纸引擎」。
/* 把自家壁纸库搬进 dsh-plugin-wallpaper-engine 的「自定义壁纸」：
   它只认自己 POST /wallpaper-engine/upload 登记过的条目（直接往 uploads 目录丢文件不会被收录，
   面板里会一直显示「已上传 0 个」）。这里在首次运行时把 /dsh-naiwa-studio/api/backgrounds.json
   里列出的每张图，原样 POST 过去登记一次，成功后在 localStorage 打标，不重复上传。 */
// dsh-meme 的内置图库（source === 'bundled'）会跟着 npm 包升级一起回来，
// 而且默认是启用状态。这里走它自己的 API 逐个体面地关掉，只保留用户自己的包。
async function muteBuiltinMemePacks() {
  if (typeof fetch !== 'function') return
  const api = '/dsh-memes-api'
  const post = async (body) => {
    const res = await fetch(api, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.json()
  }
  try {
    const root = await post({ op: 'getMemeRoot' })
    const packs = Array.isArray(root && root.packs) ? root.packs : []
    const builtins = packs.filter((p) => p && p.source === 'bundled' && p.enabled && p.id)
    for (const pack of builtins) {
      try {
        await post({ op: 'setPackEnabled', packId: pack.id, enabled: false })
      } catch (err) { /* 单个失败不影响其它包 */ }
    }
  } catch (err) { /* 表情插件不在、或接口变了，静默跳过 */ }
}

async function migrateWallpapersToEngine() {
  if (!WALL_OWNED_ELSEWHERE) return
  var FLAG = 'dsh-naiwa:we-migrated'
  if (localStorage.getItem(FLAG) === '2') return
  try {
    var list = await fetch('/dsh-naiwa-studio/api/backgrounds.json', { cache: 'no-store' }).then(function (r) { return r.json() })
    var items = (list && list.items) || []
    if (!items.length) return
    var have = new Set()
    try {
      var inv = await fetch('/wallpaper-engine/inventory', { cache: 'no-store' }).then(function (r) { return r.json() })
      ;(inv.items || []).forEach(function (x) { if (x && x.title) have.add(String(x.title)) })
    } catch (e) { /* inventory 拿不到就照传，最多多几条重名 */ }
    var ok = 0
    for (var i = 0; i < items.length; i += 1) {
      var it = items[i]
      var title = String(it.name || '').replace(/\.[a-z0-9]+$/i, '')
      if (!it.url || have.has(title)) continue
      try {
        var blob = await fetch(it.url, { cache: 'no-store' }).then(function (r) { return r.blob() })
        var ctype = blob.type || 'image/jpeg'
        var res = await fetch('/wallpaper-engine/upload?title=' + encodeURIComponent(title), {
          method: 'POST',
          headers: { 'content-type': ctype },
          body: blob,
        })
        if (res.ok) ok += 1
      } catch (e) { /* 单张失败不影响其它 */ }
    }
    localStorage.setItem(FLAG, '2')
    if (window.console && ok) console.info('[naiwa] migrated ' + ok + ' wallpapers into wallpaper-engine')
  } catch (e) { /* 引擎没装/路由没开就静默跳过 */ }
}

/* ---- 借 dsh-plugin-wallpaper-engine 的库：改主题色 + 末尾补一张「上传」卡 ---- */
const ENGINE_ACCENT = '#7ff0d8'   // 片头激光青
function installEngineSkin() {
  if (typeof document === 'undefined' || window.__naiwaEngineSkin) return
  window.__naiwaEngineSkin = true

  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-naiwa-studio'
  style.textContent = `
    /* 他们的强调蓝 #4f8cff -> 片头激光青。--we-accent 在设置窗里被掐成 initial，
       所以两个都写，且要写在 we-picker 作用域上而不是 :root。 */
    html body [class*="we-picker"],
    html body [class*="we-layer"] ~ div[role="dialog"],
    html body div[role="dialog"] {
      --we-accent-src: ${ENGINE_ACCENT};
      --we-accent: ${ENGINE_ACCENT};
    }
    /* 同一个 .we-picker__uploads-list 在两个页签里是两种布局：
       设置页里是 flex column（每行 36px），壁纸库页里是 grid（每格是方块）。
       所以布局尺寸由 JS 读父容器的 display 后写成行内样式，这里只管外观。 */
    .naiwa-up-card {
      box-sizing: border-box; display: flex; align-items: center; justify-content: center;
      gap: 7px; border-radius: 10px; cursor: pointer; padding: 0 10px;
      border: 1px dashed rgba(127, 240, 216, .55);
      background: linear-gradient(120deg, rgba(127,240,216,.10), rgba(127,240,216,.03));
      color: ${ENGINE_ACCENT}; font: 500 11px/1 "PingFang SC", "Microsoft YaHei", sans-serif;
      transition: border-color .16s ease, box-shadow .16s ease, background .16s ease;
    }
    .naiwa-up-card:hover {
      border-color: ${ENGINE_ACCENT};
      box-shadow: 0 0 0 1px rgba(127,240,216,.45), 0 8px 22px rgba(127,240,216,.16);
      background: linear-gradient(120deg, rgba(127,240,216,.18), rgba(127,240,216,.05));
    }
    .naiwa-up-card svg { width: 14px; height: 14px; }
    .naiwa-up-card.is-busy { opacity: .5; pointer-events: none; }
    /* 壁纸库选择器（.we-picker__grid）每格约 132x94，+ 卡也做成同样小方块 */
    .naiwa-up-tile {
      box-sizing: border-box; width: 100%; height: 100%; min-height: 94px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
      border-radius: 10px; cursor: pointer; padding: 0;
      border: 1.5px dashed rgba(127, 240, 216, .78);
      background: linear-gradient(160deg, rgba(127,240,216,.16), rgba(127,240,216,.05));
      color: #a7f5e4; font: 500 11px/1.2 "PingFang SC", "Microsoft YaHei", sans-serif;
      transition: border-color .16s ease, background .16s ease, box-shadow .16s ease;
    }
    .naiwa-up-tile:hover {
      border-style: solid; border-color: ${ENGINE_ACCENT};
      background: rgba(127,240,216,.14);
      box-shadow: 0 0 0 1px rgba(127,240,216,.40), 0 8px 22px rgba(127,240,216,.14);
    }
    .naiwa-up-tile svg { width: 22px; height: 22px; }
    /* 表情包快捷面板里的 + 卡：一键选图上传到 dsh-meme 的当前分类 */
    .naiwa-meme-add {
      box-sizing: border-box; flex: 0 0 76px; width: 76px; height: 76px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px;
      border: 1px dashed rgba(127, 240, 216, .68); border-radius: 11px; cursor: pointer;
      background: linear-gradient(160deg, rgba(127,240,216,.14), rgba(127,240,216,.04));
      color: #a7f5e4; font: 500 11px/1.2 "PingFang SC", "Microsoft YaHei", sans-serif;
      transition: border-color .16s ease, background .16s ease;
    }
    .naiwa-meme-add:hover { border-style: solid; border-color: #7ff0d8; background: rgba(127,240,216,.18); }
    .naiwa-meme-add.is-busy { opacity: .55; pointer-events: none; }
    .naiwa-meme-add svg { width: 18px; height: 18px; }
    /* dsh-meme 的弹出面板用 --dsw-alias-bg-layer-1 这个半透 token，玻璃主题下会透字；
       直接给它不透明底 + 毛玻璃。 */
    .meme-picker { z-index: 60; }
    .meme-modal { border-radius: 16px; }
    /* dsh-meme 的面板（.meme-panel）自带透明底，在玻璃主题下会透出下层正文，
       这里给它补上与壁纸引擎一致的毛玻璃底（用同一组变量，会跟着他们的颜色走） */
    .meme-picker,
    .meme-modal,
    .meme-panel {
      background: linear-gradient(150deg, var(--naiwa-glass-solid-a, rgba(24,32,30,.86)), var(--naiwa-glass-solid-b, rgba(14,20,19,.80)));
      -webkit-backdrop-filter: blur(var(--naiwa-glass-blur, 18px)) saturate(1.25);
      backdrop-filter: blur(var(--naiwa-glass-blur, 18px)) saturate(1.25);
      border: 1px solid rgba(255, 255, 255, .12);
      border-radius: 16px;
      padding: 16px 18px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .08), 0 12px 30px rgba(0, 0, 0, .28);
    }
  `
  document.head.appendChild(style)

  const toast = (text) => {
    let el = document.querySelector('.naiwa-up-toast')
    if (!el) {
      el = document.createElement('div')
      el.className = 'naiwa-up-toast'
      el.style.cssText = 'position:fixed;left:50%;bottom:36px;transform:translateX(-50%);z-index:2147483000;'
        + 'padding:8px 14px;border-radius:10px;background:#17241f;color:#d7fff5;font:500 12px/1.4 "PingFang SC",sans-serif;'
        + 'box-shadow:0 12px 30px rgba(0,0,0,.35);opacity:0;transition:opacity .2s ease;pointer-events:none'
      document.body.appendChild(el)
    }
    el.textContent = text
    el.style.opacity = '1'
    clearTimeout(el.__t)
    el.__t = setTimeout(() => { el.style.opacity = '0' }, 2200)
  }

  const refreshTheirList = () => {
    const btn = [...document.querySelectorAll('[role="dialog"] button')].find((b) => /^(刷新|Refresh)$/.test((b.textContent || '').trim()))
    if (btn) btn.click()
  }

  const uploadFiles = async (files) => {
    let ok = 0
    for (const file of files) {
      try {
        const title = String(file.name || '壁纸').replace(/\.[a-z0-9]+$/i, '').slice(0, 80)
        const res = await fetch('/wallpaper-engine/upload?title=' + encodeURIComponent(title), {
          method: 'POST',
          headers: { 'content-type': file.type || 'image/jpeg' },
          body: file,
        })
        if (res.ok) ok += 1
      } catch (e) { /* 单张失败继续 */ }
    }
    if (ok) { toast('已上传 ' + ok + ' 张'); setTimeout(refreshTheirList, 350) }
    else toast('上传失败：只支持 JPG / PNG / MP4')
  }

  const pickFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,video/mp4'
    input.multiple = true
    input.addEventListener('change', () => { if (input.files && input.files.length) uploadFiles([...input.files]) })
    input.click()
  }

  // 跟着父容器的布局决定尺寸：grid 页签里是方块，列表页签里是一行
  const fit = (list, card) => {
    let display = 'flex'
    try { display = getComputedStyle(list).display } catch { /* ignore */ }
    if (display.includes('grid')) {
      card.style.width = '100%'
      card.style.height = '100%'
      card.style.minHeight = '96px'
      card.style.aspectRatio = '16 / 10'
      card.style.flexDirection = 'column'
    } else {
      card.style.width = '100%'
      card.style.height = '36px'
      card.style.minHeight = '36px'
      card.style.aspectRatio = 'auto'
      card.style.flexDirection = 'row'
    }
  }

  const decorate = () => {
    const lists = document.querySelectorAll('.we-picker__uploads-list')
    for (const list of lists) {
      const exist = list.querySelector('[data-naiwa-up]')
      if (exist) {
        const mode = getComputedStyle(list).display.indexOf('grid') >= 0 ? 'grid' : 'row'
        if (exist.dataset.fit !== mode) { fit(list, exist); exist.dataset.fit = mode }
        continue
      }
      const card = document.createElement('button')
      card.type = 'button'
      card.dataset.naiwaUp = '1'
      card.className = 'naiwa-up-card'
      card.title = '上传 JPG / PNG / MP4'
      card.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg><span>上传壁纸</span>'
      card.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); pickFile() })
      list.appendChild(card)
      fit(list, card)
    }
  }

  // 选择壁纸网格里不再插上传卡：会被他们的排序夹在壁纸中间。上传入口放到灵感池弹窗。
  const decorateGrid = () => {}

  // 表情包快捷面板（.meme-picker）里的 + 卡
  const memeAdd = async (files, tag) => {
    let ok = 0
    for (const file of files) {
      try {
        const dataUrl = await new Promise((resolve) => {
          const fr = new FileReader()
          fr.onload = () => resolve(String(fr.result || ''))
          fr.onerror = () => resolve('')
          fr.readAsDataURL(file)
        })
        const dataBase64 = dataUrl.split(',')[1] || ''
        if (!dataBase64) continue
        const res = await fetch('/dsh-memes-api', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ op: 'upload', tag, fileName: file.name, dataBase64 }),
        })
        const out = await res.json().catch(() => null)
        if (out && out.ok) ok += 1
      } catch (e) { /* 单张失败继续 */ }
    }
    return ok
  }

  const decorateMeme = () => {
    const picker = document.querySelector('.meme-picker')
    if (!picker) return
    const grid = picker.querySelector('.mp-grid') || picker.querySelector('.meme-grid')
    if (!grid) return
    const had = grid.querySelector('[data-naiwa-meme-add]')
    if (had) return   // 只插一次；反复挪位会和他们的重排自激
    const card = document.createElement('button')
    card.type = 'button'
    card.dataset.naiwaMemeAdd = '1'
    card.className = 'naiwa-meme-add'
    card.title = '上传表情包（jpg/png/gif/webp）'
    card.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg><span>添加表情</span>'
    card.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      // 分类取面板里那个筛选下拉的当前值，没选就用 daily
      // 他们的分类是一排筛选 chip，没有 &<select&>：先读激活的 chip，否则用 daily
      let tag = 'daily'
      const active = picker.querySelector('.mp-filter-row .is-active, .mp-filter-row [aria-pressed="true"], .mp-filter-row button.active')
      if (active) {
        const raw = String(active.textContent || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
        if (raw) tag = raw
      }
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/jpeg,image/png,image/gif,image/webp'
      input.multiple = true
      input.addEventListener('change', async () => {
        if (!input.files || !input.files.length) return
        card.classList.add('is-busy')
        const label = card.querySelector('span')
        const old = label.textContent
        label.textContent = '上传中…'
        const ok = await memeAdd([...input.files], tag)
        label.textContent = old
        card.classList.remove('is-busy')
        toast(ok ? '已添加 ' + ok + ' 张到 ' + tag : '上传失败：仅支持 jpg/png/gif/webp')
        if (ok) {
          // 重开一次面板让他们重新拉列表
          const trigger = document.querySelector('.meme-trigger')
          if (trigger) { trigger.click(); setTimeout(() => trigger.click(), 260) }
        }
      })
      input.click()
    })
    grid.insertBefore(card, grid.firstElementChild)
  }

  // 壁纸引擎的侧边抽屉（.we-qp）里也放一个 + 上传壁纸，放在卡片列表最前面
  // 抽屉里不再放上传入口：浮层会挡住「壁纸/外观/播放」标签，插进列表又会破坏滚动。
  // 上传统一走设置页 → 壁纸引擎 → 自定义壁纸 →「+ 上传壁纸」。
  const decorateQuickPanel = () => {}

  // rAF 合并 + 重入锁：避免「我们插节点 → 触发 observer → 再插」的自激循环
  let decorating = false
  const runDecorate = () => {
    if (decorating) return
    decorating = true
    requestAnimationFrame(() => {
      try { decorate(); decorateGrid(); decorateMeme(); decorateQuickPanel() } finally { decorating = false }
    })
  }
  const observer = new MutationObserver(runDecorate)
  observer.observe(document.body, { childList: true, subtree: true })
  decorate()
  decorateGrid()
  decorateMeme()
  decorateQuickPanel()
}

function uploadWallpapers() {
  // 选图 → 走壁纸引擎自己的上传接口 → 刷新它的列表
  const input = document.createElement("input")
  input.type = "file"
  input.accept = "image/jpeg,image/png,image/webp,video/mp4"
  input.multiple = true
  input.addEventListener("change", async () => {
    const files = [...(input.files || [])]
    if (!files.length) return
    let ok = 0
    for (const file of files) {
      try {
        const buf = await file.arrayBuffer()
        const title = file.name.replace(/\.[^.]+$/, "")
        const res = await fetch("/wallpaper-engine/upload?title=" + encodeURIComponent(title), {
          method: "POST",
          headers: { "content-type": file.type || "application/octet-stream" },
          body: buf,
        })
        if (res.ok) ok += 1
      } catch (e) { /* 单张失败继续 */ }
    }
    toast(ok ? "已上传 " + ok + " 张壁纸" : "上传失败：jpg / png / webp / mp4")
    if (ok) {
      const refresh = [...document.querySelectorAll(".we-picker__btn")].find((b) => /刷新/.test(b.textContent || ""))
      if (refresh) refresh.click()
    }
  })
  input.click()
}

function openWallpaperEnginePanel() {
  // 抄 dsh-plugin-wallpaper-engine 自己的 openSettingsSection：
  // ① 对话框已开 → 点设置左栏 nav 里的「壁纸引擎」；
  // ② 否则点账号菜单（官方 app 的设置入口真身：aria-haspopup=menu + data-collapsed/data-signed-out）；
  // ③ 菜单里点「设置」→ 等对话框挂载（短轮询至多 6s）→ 点「壁纸引擎」。
  const norm = (t) => String(t || "").replace(/\s+/g, " ").trim()
  const NAV = /^(壁纸引擎|Wallpaper Engine)$/
  const SETTING = /(设置|設定|Settings|全局设置|Global settings)/
  const clickNav = () => {
    let rows = []
    try { rows = [...document.querySelectorAll("nav button, [role=tablist] button")] } catch { return false }
    for (const b of rows) {
      if (NAV.test(norm(b.textContent))) { try { b.click(); return true } catch { return false } }
    }
    return false
  }
  if (clickNav()) return true
  let menuBtn = null
  try {
    menuBtn = document.querySelector('button[aria-haspopup="menu"][data-collapsed], button[aria-haspopup="menu"][data-signed-out]')
  } catch { menuBtn = null }
  if (menuBtn) { try { menuBtn.click() } catch { return false } }
  let opened = false
  let tries = 0
  const started = Date.now()
  const step = () => {
    if (opened) return
    if (clickNav()) { opened = true; return }
    // 菜单已经弹出：找「设置」项点掉（只点一次）
    if (menuBtn && tries < 26) {
      let items = []
      try { items = [...document.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"]')] } catch { items = [] }
      const item = items.find((el) => SETTING.test(norm(el.textContent)))
      if (item) { try { item.click() } catch { /* ignore */ } menuBtn = null }
    }
    tries += 1
    if (Date.now() - started > 6000) { return }
    setTimeout(step, 110)
  }
  setTimeout(step, 60)
  return true
}

function toggleWallpaperDrawer() {
  // 借他们自己的吉祥物绳结当开关：RopeDock 里「点击 = wallSidebarToggle()」。
  // 吉祥物已被我们 CSS 隐藏（看不见但节点还在），这里直接派发一对零位移的
  // pointerdown / pointerup，等价于用户点了一下那个绳结。
  let rope = null
  try {
    rope = document.querySelector('#dsh-wallpaper-engine-rope-dock .we-rope')
      || document.querySelector('.we-rope')
  } catch { rope = null }
  if (!rope) return false
  const box = rope.getBoundingClientRect()
  if (!box || box.width === 0 || box.height === 0) return false
  const x = Math.round(box.left + box.width / 2)
  const y = Math.round(box.top + box.height / 2)
  const mk = (type) => new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: x,
    clientY: y,
    pointerId: 1,
    pointerType: "mouse",
    isPrimary: true,
    button: 0,
    buttons: type === "pointerdown" ? 1 : 0,
  })
  try {
    rope.dispatchEvent(mk("pointerdown"))
    rope.dispatchEvent(mk("pointerup"))
    return true
  } catch {
    return false
  }
}

let WALL_OPEN = null
// 壁纸与配色交给 dsh-plugin-wallpaper-engine：本插件不再画壁纸、不再覆盖主题 token
const WALL_OWNED_ELSEWHERE = true

function mount() {
  if (document.querySelector('[data-naiwa-skin]')) return () => {}

  const cleanup = []
  const add = (node, parent = document.body) => {
    parent.appendChild(node)
    cleanup.push(() => node.remove())
    return node
  }

  // ---- 样式 ----
  const style = document.createElement('style')
  style.dataset.naiwaSkin = 'style'
  style.textContent = CSS
  document.head.appendChild(style)
  cleanup.push(() => style.remove())

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true




  const wall = document.createElement('div')
  wall.className = 'naiwa-wall'
  wall.dataset.naiwaSkin = 'wall'
  document.body.insertBefore(wall, document.body.firstChild)

  const applyWall = (url) => {
    if (typeof url !== 'string' || url.length === 0) return
    const value = `url("${url}")`
    // 内层：负责淡入反馈
    wall.style.backgroundImage = value
    wall.dataset.url = url
    wall.classList.remove('is-flash')
    void wall.offsetWidth
    wall.classList.add('is-flash')
    // 壁纸只落在 .naiwa-wall 这一层上（它自己是独立合成层，画一次就不再重绘）。
    // 不再往 body 上写背景：body 背景每帧都要参与合成，拖动宠物时整页重绘就是卡顿的来源。
    document.documentElement.style.setProperty('background-color', '#fffaf0', 'important')
    document.body.style.setProperty('background-color', 'transparent', 'important')
  }

  if (!WALL_OWNED_ELSEWHERE) applyWall(WALL_SRC)
  cleanup.push(() => {
    wall.remove()
    document.documentElement.style.removeProperty('background-color')
    document.body.style.removeProperty('background-color')
  })

  // ---- 壁纸库：已整体交给 dsh-plugin-wallpaper-engine（WALL_OWNED_ELSEWHERE），
  //      自家的模态/上传/删除/观影模式/轻量模式全部不再构建；胶囊改为直开他们的设置页 ----
  WALL_OPEN = null
  if (!WALL_OWNED_ELSEWHERE) {
    const savedKey = 'dsh-naiwa-studio:wall'
    let saved = ''
    try { saved = localStorage.getItem(savedKey) ?? '' } catch { /* 忽略 */ }

    const mask = document.createElement('div')
    mask.className = 'naiwa-wallmask'

    const panel = document.createElement('div')
    panel.className = 'naiwa-wallpanel'
    panel.innerHTML = `
      <header>
        <strong>奶蛙壁纸库</strong>
        <small>点一张换成背景</small>
        <button type="button" class="naiwa-wallclose" aria-label="关闭">×</button>
      </header>
      <div class="naiwa-wallpanel-grid" role="list"></div>
      <footer>
        <button type="button" class="pick">换一张</button>
        <label class="up">上传<input type="file" accept="image/png,image/jpeg,image/webp" hidden></label>
        <button type="button" class="mode" title="深色玻璃 + 亮字，壁纸全透">观影模式</button>
        <button type="button" class="lite" title="卡的时候打开：去掉壁纸只留纯色">轻量模式</button>
        <span class="hint"></span>
      </footer>`

    const grid = panel.querySelector('.naiwa-wallpanel-grid')
    const hint = panel.querySelector('.hint')
    const upInput = panel.querySelector('.up input')

    const closePanel = () => {
      panel.classList.remove('is-open')
      mask.classList.remove('is-open')
    }

    // 轻量模式：把壁纸整个关掉，只留奶油底色。
    // 用来判断「卡」到底是不是壁纸这一层造成的——关掉后如果立刻顺滑，就是它。
    const LITE_KEY = 'dsh-naiwa-studio:lite'
    const liteBtn = panel.querySelector('.lite')
    let lite = false
    try { lite = localStorage.getItem(LITE_KEY) === '1' } catch { /* 忽略 */ }
    const applyLite = (on) => {
      lite = on
      try { localStorage.setItem(LITE_KEY, on ? '1' : '0') } catch { /* 忽略 */ }
      wall.style.display = on ? 'none' : ''
      liteBtn.classList.toggle('is-on', on)
      liteBtn.textContent = on ? '轻量模式·开' : '轻量模式'
    }
    applyLite(lite)
    liteBtn.addEventListener('click', () => applyLite(!lite))

    // 观影模式：深色玻璃面板 + 亮色文字，壁纸几乎全透。
    // 浅色主题下「深字压照片」是最难读的组合，所以深色模式单独给一套 token。
    const MODE_KEY = 'dsh-naiwa-studio:mode'
    const modeBtn = panel.querySelector('.mode')
    let dark = false
    try { dark = localStorage.getItem(MODE_KEY) === '1' } catch { /* 忽略 */ }
    const applyMode = (on) => {
      dark = on
      try { localStorage.setItem(MODE_KEY, on ? '1' : '0') } catch { /* 忽略 */ }
      document.documentElement.dataset.naiwaMode = on ? 'dark' : ''
      modeBtn.classList.toggle('is-on', on)
      modeBtn.textContent = on ? '观影模式·开' : '观影模式'
      const theme = studioCtx && studioCtx.theme
      if (!theme || typeof theme.overrideTokens !== 'function') return
      try {
        if (on) {
          theme.overrideTokens('naiwa-studio', DARK_TOKENS)
        } else if (THEME_LIGHT) {
          theme.overrideTokens('naiwa-studio', THEME_LIGHT)
        }
      } catch (error) {
        console.warn('[naiwa-studio] 切主题失败：' + (error && error.message ? error.message : error))
      }
    }
    applyMode(dark)
    modeBtn.addEventListener('click', () => applyMode(!dark))

    const pick = (url) => {
      applyWall(url)
      try { localStorage.setItem(savedKey, url) } catch { /* 忽略 */ }
      saved = url
      for (const node of grid.querySelectorAll('.naiwa-wallpanel-cell')) {
        node.classList.toggle('is-active', node.dataset.url === url)
      }
      hint.textContent = '换好了'
      window.setTimeout(() => { if (hint.textContent === '换好了') hint.textContent = '' }, 1600)
    }

    const render = (items) => {
      grid.textContent = ''
      if (items.length === 0) {
        const empty = document.createElement('p')
        empty.className = 'naiwa-wallpanel-empty'
        empty.textContent = '还没有壁纸，先上传一张吧。'
        grid.appendChild(empty)
        return
      }
      for (const item of items) {
        const cell = document.createElement('div')
        cell.className = 'naiwa-wallpanel-cell'
        cell.setAttribute('role', 'listitem')
        cell.setAttribute('aria-label', item.name)
        cell.dataset.url = item.url
        cell.tabIndex = 0
        const img = document.createElement('img')
        img.alt = ''
        img.loading = 'lazy'
        img.src = item.url
        cell.appendChild(img)

        const del = document.createElement('button')
        del.type = 'button'
        del.className = 'naiwa-walldel'
        del.title = `删除 ${item.name}`
        del.setAttribute('aria-label', `删除 ${item.name}`)
        del.textContent = '×'
        del.addEventListener('click', (event) => {
          event.stopPropagation()
          void removeItem(item, cell)
        })
        cell.appendChild(del)

        cell.addEventListener('click', () => pick(item.url))
        cell.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            pick(item.url)
          }
        })
        if (item.url === saved) cell.classList.add('is-active')
        grid.appendChild(cell)
      }
    }

    const removeItem = async (item, cell) => {
      cell.classList.add('is-busy')
      hint.textContent = '删除中…'
      try {
        const res = await fetch(`/dsh-naiwa-studio/api/delete?name=${encodeURIComponent(item.name)}`, {
          method: 'POST'
        })
        const data = await res.json()
        if (!data?.ok) throw new Error(data?.error ?? 'delete failed')
        // 删掉的正好是当前壁纸：退回默认那张，别让背景变成空的
        if (saved === item.url) {
          saved = ''
          try { localStorage.removeItem(savedKey) } catch { /* 忽略 */ }
          if (!WALL_OWNED_ELSEWHERE) applyWall(WALL_SRC)
        }
        const items = await loadList()
        hint.textContent = items.length > 0 ? `已删除 · 还剩 ${items.length} 张` : '已删除，库空了'
        window.setTimeout(() => {
          if (hint.textContent.startsWith('已删除')) hint.textContent = items.length > 0 ? `${items.length} 张` : ''
        }, 1800)
      } catch (err) {
        cell.classList.remove('is-busy')
        hint.textContent = '删除失败'
        window.setTimeout(() => { if (hint.textContent === '删除失败') hint.textContent = '' }, 1800)
      }
    }

    const loadList = async () => {
      hint.textContent = '读取中…'
      try {
        const res = await fetch('/dsh-naiwa-studio/api/backgrounds.json', { cache: 'no-store' })
        const data = await res.json()
        const items = Array.isArray(data?.items) ? data.items : []
        render(items)
        hint.textContent = items.length > 0 ? `${items.length} 张` : ''
        return items
      } catch {
        hint.textContent = '读取失败'
        return []
      }
    }

    const openPanel = () => {
      mask.classList.add('is-open')
      panel.classList.add('is-open')
      void loadList()
    }
    WALL_OPEN = openPanel

    panel.querySelector('.naiwa-wallclose').addEventListener('click', closePanel)
    mask.addEventListener('click', closePanel)
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closePanel() })

    panel.querySelector('.pick').addEventListener('click', () => {
      const cells = [...grid.querySelectorAll('.naiwa-wallpanel-cell')]
      if (cells.length === 0) {
        void loadList()
        return
      }
      cells[Math.floor(Math.random() * cells.length)].click()
    })

    upInput.addEventListener('change', async () => {
      const file = upInput.files?.[0]
      if (!file) return
      hint.textContent = '上传中…'
      try {
        const res = await fetch(`/dsh-naiwa-studio/api/upload?name=${encodeURIComponent(file.name)}`, {
          method: 'POST',
          headers: { 'content-type': file.type || 'application/octet-stream' },
          body: file
        })
        const data = await res.json()
        if (!data?.ok) throw new Error(data?.error ?? 'upload failed')
        const items = await loadList()
        const fresh = items.find((item) => item.name === data.name)
        if (fresh) pick(fresh.url)
      } catch {
        hint.textContent = '上传失败'
      } finally {
        upInput.value = ''
      }
    })

    document.body.appendChild(mask)
    document.body.appendChild(panel)
    cleanup.push(() => { mask.remove(); panel.remove() })

    if (!WALL_OWNED_ELSEWHERE && saved) applyWall(saved)

    // 入口已挪到侧栏「奶蛙灵感池」卡片上，这里不再往桌宠菜单里塞东西。

  }

  // ---- 背景光晕 + 水泡 ----
  const veil = document.createElement('div')
  veil.className = 'naiwa-veil'
  veil.dataset.naiwaSkin = 'veil'
  const bubbleCount = reduced ? 0 : 16
  for (let i = 0; i < bubbleCount; i += 1) {
    const b = document.createElement('span')
    b.className = 'naiwa-orb'
    const size = 6 + Math.random() * 26
    b.style.setProperty('--x', `${Math.random() * 100}%`)
    b.style.setProperty('--s', `${size.toFixed(0)}px`)
    b.style.setProperty('--d', `${(14 + Math.random() * 16).toFixed(1)}s`)
    b.style.setProperty('--delay', `${(-Math.random() * 20).toFixed(1)}s`)
    b.style.setProperty('--sway', `${(Math.random() * 60 - 30).toFixed(0)}px`)
    veil.appendChild(b)
  }
  add(veil)

  // ---- 启动动画 ----
  // 首选路径是宿主 tapIndex 在 index.html 里注入（React 之前就存在）。
  // 但如果那个注入没成功，这里兜底再建一次同样的启动层，保证用户一定能看到。
  if (!document.getElementById('nb-boot') && !window.__NAIWA_SPLASH_DONE__) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/dsh-naiwa-studio/startup/splash.css'
    document.head.appendChild(link)
    document.documentElement.classList.add('nb-lock')

    const shell = document.createElement('div')
    shell.innerHTML = `<div id="nb-boot" style="position:fixed;inset:0;z-index:2147483600;background:#000;overflow:hidden">
      <div id="nb-stage"><div id="nb-frame">
        <video id="nb-video" src="/dsh-naiwa-studio/startup/naiwa-startup.mp4" muted playsinline preload="auto"></video>
        <canvas id="nb-fx"></canvas>
        <div id="nb-veil"></div>
        <div id="nb-glow"></div>
        <div id="nb-scan"></div>
        <div class="nb-panel" id="nb-p-tl"></div>
        <div class="nb-panel" id="nb-p-tr"></div>
        <div class="nb-panel" id="nb-p-bl"></div>
        <div class="nb-panel" id="nb-p-br"></div>
        <div id="nb-progress"><div id="nb-bar"><i></i></div><div id="nb-status">INITIALIZING</div></div>
      </div></div>
      <div id="nb-skip"><i></i>跳过片头 · ESC</div>
    </div>`
    const bootNode = shell.firstElementChild
    document.body.appendChild(bootNode)
    window.__NAIWA_BOOT__ = { cut: 4.367, dim: 0.2803, hold: 5.62, minMs: 4000, maxMs: 12000, version: '0.1.0' }

    const runner = document.createElement('script')
    runner.src = '/dsh-naiwa-studio/startup/splash.js'
    runner.defer = true
    document.body.appendChild(runner)

    // 兜底：万一 splash.js 没跑起来，13 秒后一定要把界面放开
    const rescue = setTimeout(() => {
      if (window.__NAIWA_SPLASH_DONE__) return
      document.documentElement.classList.remove('nb-lock')
      const alive = document.getElementById('nb-boot')
      if (alive) alive.remove()
    }, 13000)

    cleanup.push(() => {
      clearTimeout(rescue)
      runner.remove()
      link.remove()
      bootNode.remove()
      document.documentElement.classList.remove('nb-lock')
    })
  }

  // ---- 桌宠 ----
  // 页内不养第二只蛙：真正的桌宠是桌面上的独立窗口（能拖出 Harness 窗口）。
  // 这里保留节点以复用气泡/台词逻辑，但用 CSS 藏起来，双击也开不了设定卡，
  // 设定卡改走 Ctrl/⌘ + Shift + C。
  let hidden = false
  try {
    hidden = localStorage.getItem(LS_HIDDEN) === '1'
  } catch {
    /* 忽略 */
  }

  const pet = document.createElement('div')
  pet.className = 'naiwa-skin-pet'
  pet.dataset.naiwaSkin = 'pet'
  pet.innerHTML = `
    <div class="naiwa-skin-bubble"></div>
    <img class="naiwa-pet-shadow" alt="" src="${SHADOW_SRC}">
    <img class="naiwa-pet-img" alt="奶蛙" src="${PET_SRC}" draggable="false">`

  const pos = readPos()
  if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
    pet.style.setProperty('--naiwa-x', `${pos.x}px`)
    pet.style.setProperty('--naiwa-y', `${pos.y}px`)
  }
  if (hidden) pet.style.display = 'none'
  add(pet)

  const bubble = pet.querySelector('.naiwa-skin-bubble')
  const voice = createVoice()
  let bubbleTimer = 0

  /** 弹性形变：压扁 → 回弹，配合按压手感。 */
  const squish = () => {
    if (reduced) return
    pet.classList.remove('is-squish')
    void pet.offsetWidth
    pet.classList.add('is-squish')
  }
  pet.addEventListener('animationend', (event) => {
    if (event.animationName === 'naiwa-squish') pet.classList.remove('is-squish')
  })
  const say = (text, ms = 3200) => {
    bubble.textContent = text
    bubble.classList.add('is-on')
    clearTimeout(bubbleTimer)
    bubbleTimer = setTimeout(() => bubble.classList.remove('is-on'), ms)
  }
  cleanup.push(() => clearTimeout(bubbleTimer))

  // 拖动 + 点击 + 双击
  let dragging = false
  let moved = false
  let startX = 0
  let startY = 0
  let originLeft = 0
  let originBottom = 0
  let clicks = 0

  /**
   * 活动范围（借 dsh-plugin-naiwa-theme 的算法）：
   * 横向以对话区 _centerCol 为界，纵向顶部留 165px 给标题，底部贴到窗口下沿。
   */
  const petArea = () => {
    const w = pet.offsetWidth || 124
    const h = pet.offsetHeight || 180
    const col = document.querySelector('[class*="_centerCol"]')
    const rect = col ? col.getBoundingClientRect() : null
    const leftEdge = rect && rect.width > w + 24 ? rect.left : 0
    const rightEdge = rect && rect.width > w + 24 ? rect.right : window.innerWidth
    const minX = Math.max(8, leftEdge + 8)
    const maxX = Math.max(minX, Math.min(rightEdge - w - 12, window.innerWidth - w - 8))
    const maxBottom = 12
    const minBottom = Math.max(maxBottom, window.innerHeight - h - 165)
    return { minX, maxX, minBottom, maxBottom }
  }

  const onPointerDown = (event) => {
    if (event.button !== 0) return
    // 阻止默认的图片拖拽 / 文本选中（就是那个蓝色方块）
    event.preventDefault()
    const rect = pet.getBoundingClientRect()
    dragging = true
    moved = false
    startX = event.clientX
    startY = event.clientY
    originLeft = rect.left
    originBottom = window.innerHeight - rect.bottom
    pet.classList.add('is-dragging')
    squish()
    pet.setPointerCapture?.(event.pointerId)
  }

  const onPointerMove = (event) => {
    if (!dragging) {
      // 悬停时轻微「看向」鼠标
      const rect = pet.getBoundingClientRect()
      const dx = (event.clientX - (rect.left + rect.width / 2)) / rect.width
      const lean = Math.max(-1, Math.min(1, dx)) * 6
      pet.style.setProperty('--naiwa-lean', `${lean.toFixed(1)}px`)
      pet.style.setProperty('--naiwa-tilt', `${(lean / 3).toFixed(2)}deg`)
      return
    }
    const dx = event.clientX - startX
    const dy = event.clientY - startY
    if (Math.abs(dx) + Math.abs(dy) > 6) moved = true
    const area = petArea()
    const left = Math.max(area.minX, Math.min(area.maxX, originLeft + dx))
    const bottom = Math.max(area.minBottom, Math.min(area.maxBottom, originBottom - dy))
    pet.style.right = 'auto'
    pet.style.left = `${left}px`
    pet.style.bottom = `${bottom}px`
  }

  const onPointerUp = () => {
    if (!dragging) return
    dragging = false
    pet.classList.remove('is-dragging')
    if (moved) {
      const rect = pet.getBoundingClientRect()
      savePos(window.innerWidth - rect.right, window.innerHeight - rect.bottom)
      voice.boop(0.9 + Math.random() * 0.2)
      return
    }
    // 点一下：跳 + 说 + 呱
    clicks += 1
    pet.classList.remove('is-jump')
    void pet.offsetWidth
    pet.classList.add('is-jump')
    voice.croak(0.94 + Math.random() * 0.14)
    say(pickQuip(clicks), 2600)
    if (clicks === ROSE_AT) {
      clicks = 0
      celebrate()
    }
  }

  const celebrate = () => {
    if (reduced) return
    const rect = pet.getBoundingClientRect()
    for (let i = 0; i < 18; i += 1) {
      const petal = document.createElement('div')
      petal.className = 'naiwa-petal'
      petal.style.left = `${rect.left + rect.width * 0.5 + (Math.random() * 40 - 20)}px`
      petal.style.top = `${rect.top + 20}px`
      petal.style.setProperty('--dx', `${(Math.random() * 2 - 1) * 160}px`)
      petal.style.setProperty('--dur', `${(1.8 + Math.random() * 1.4).toFixed(2)}s`)
      petal.style.animationDelay = `${(Math.random() * 0.25).toFixed(2)}s`
      document.body.appendChild(petal)
      setTimeout(() => petal.remove(), 4000)
    }
    say('……好多花瓣。呱。', 2600)
  }

  pet.addEventListener('pointerdown', onPointerDown)
  pet.addEventListener('pointermove', onPointerMove)
  pet.addEventListener('pointerup', onPointerUp)
  pet.addEventListener('pointercancel', onPointerUp)
  pet.addEventListener('pointerleave', () => {
    if (!dragging) {
      pet.style.setProperty('--naiwa-lean', '0px')
      pet.style.setProperty('--naiwa-tilt', '0deg')
    }
  })
  const onPetGone = (event) => {
    // Ctrl/⌘ + 双击：本页隐藏，刷新后回来
    if (!(event.ctrlKey || event.metaKey)) return
    pointerHidden()
  }
  pet.addEventListener('dblclick', onPetGone)
  cleanup.push(() => {
    pet.removeEventListener('pointerdown', onPointerDown)
    pet.removeEventListener('pointermove', onPointerMove)
    pet.removeEventListener('pointerup', onPointerUp)
    pet.removeEventListener('pointercancel', onPointerUp)
    pet.removeEventListener('dblclick', onPetGone)
  })

  const pointerHidden = () => {
    pet.style.display = 'none'
    try {
      localStorage.setItem(LS_HIDDEN, '1')
    } catch {
      /* 忽略 */
    }
    say('那我先潜水了，按 `Ctrl/⌘ + Shift + N` 可以叫我回来。', 4200)
    document.addEventListener('keydown', onKey)
  }

  // ---- 人物设定卡 ----
  const card = document.createElement('div')
  card.className = 'naiwa-card'
  card.dataset.naiwaSkin = 'card'
  card.innerHTML = `
    <div class="naiwa-card-head">
      <img class="naiwa-card-face" alt="" src="${FACE_SRC}">
      <button class="naiwa-card-close" type="button" aria-label="关闭">×</button>
    </div>
    <div class="naiwa-card-body">
      <div class="naiwa-card-name">奶蛙</div>
      <div class="naiwa-card-tagline">NAIWA · 住在你工作区的蛙</div>
      <div class="naiwa-card-traits">${TRAITS.map((t) => `<span>${t}</span>`).join('')}</div>
      <p class="naiwa-card-text">${INTRO}</p>
    </div>`
  add(card)
  card.querySelector('.naiwa-card-close').addEventListener('click', () => card.classList.remove('is-on'))
  const onCardBackdrop = (event) => {
    if (event.target === card) card.classList.remove('is-on')
  }
  card.addEventListener('click', onCardBackdrop)

  const openCard = () => card.classList.add('is-on')
  // 双击桌宠 = 打开设定卡（Ctrl/⌘ 除外，那是隐藏）
  pet.addEventListener('dblclick', (event) => {
    if (event.ctrlKey || event.metaKey) return
    openCard()
  })

  // 右下角状态点：连点 3 次也能开（避免桌宠被拖到屏幕外时打不开）
  const onKey = (event) => {
    const key = event.key.toLowerCase()
    // Ctrl/⌘ + Shift + M：静音开关
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 'm') {
      event.preventDefault()
      say(voice.toggle() ? '先静音，等你想听再开。' : '好，我能出声了。', 2200)
      return
    }
    const combo = (event.ctrlKey || event.metaKey) && event.shiftKey && key === 'n'
    if (key === 'c' && (event.ctrlKey || event.metaKey) && event.shiftKey) {
      event.preventDefault()
      openCard()
      return
    }
    if (!combo) return
    if (pet.style.display === 'none') {
      pet.style.display = ''
      try {
        localStorage.setItem(LS_HIDDEN, '0')
      } catch {
        /* 忽略 */
      }
      say('我回来了。', 1800)
    } else {
      pointerHidden()
    }
  }
  document.addEventListener('keydown', onKey)
  cleanup.push(() => document.removeEventListener('keydown', onKey))

  // 开机一句，别太吵
  if (!hidden) setTimeout(() => say('呱。我在右下角，有事戳我。', 3600), 1400)

  let THEME_LIGHT = null
  const DARK_TOKENS = {
    '--dsw-alias-bg-base': { light: 'rgba(18, 20, 18, 0.68)', dark: 'rgba(18, 20, 18, 0.68)' },
    '--dsw-alias-bg-layer-1': { light: 'rgba(26, 29, 26, 0.74)', dark: 'rgba(26, 29, 26, 0.74)' },
    '--dsw-alias-bg-layer-2': { light: 'rgba(32, 35, 32, 0.82)', dark: 'rgba(32, 35, 32, 0.82)' },
    '--dsw-alias-bg-layer-3': { light: 'rgba(38, 42, 38, 0.86)', dark: 'rgba(38, 42, 38, 0.86)' },
    '--dsw-alias-bg-module-platform': { light: 'rgba(22, 25, 22, 0.82)', dark: 'rgba(22, 25, 22, 0.82)' },
    '--dsw-alias-settings-card-fill': { light: 'rgba(34, 38, 34, 0.88)', dark: 'rgba(34, 38, 34, 0.88)' },
    '--dsw-alias-border-l1': { light: 'rgba(255, 236, 190, 0.16)', dark: 'rgba(255, 236, 190, 0.16)' },
    '--dsw-alias-border-l2': { light: 'rgba(255, 236, 190, 0.24)', dark: 'rgba(255, 236, 190, 0.24)' },
    '--dsw-alias-brand-primary': { light: '#f0c530', dark: '#f0c530' },
    '--dsw-alias-brand-text': { light: '#f7dc6b', dark: '#f7dc6b' },
    '--dsw-alias-button-primary-fill': { light: '#e8c135', dark: '#e8c135' },
    '--dsw-alias-button-primary-fill-hover': { light: '#f5d253', dark: '#f5d253' },
    '--dsw-alias-interactive-bg-hover': { light: 'rgba(255, 205, 90, 0.18)', dark: 'rgba(255, 205, 90, 0.18)' },
    '--dsw-alias-interactive-bg-active': { light: 'rgba(255, 205, 90, 0.26)', dark: 'rgba(255, 205, 90, 0.26)' },
    '--dsw-specific-sidebar-fill': { light: 'rgba(20, 23, 20, 0.72)', dark: 'rgba(20, 23, 20, 0.72)' },
    '--dsw-specific-sidebar-item-hover': { light: 'rgba(241, 201, 54, 0.12)', dark: 'rgba(241, 201, 54, 0.12)' },
    '--dsw-specific-sidebar-item-active': { light: 'rgba(241, 201, 54, 0.20)', dark: 'rgba(241, 201, 54, 0.20)' },
    '--dsw-specific-bubble': { light: 'rgba(30, 34, 30, 0.92)', dark: 'rgba(30, 34, 30, 0.92)' },
    '--dsw-specific-input-major': { light: 'rgba(30, 34, 30, 0.94)', dark: 'rgba(30, 34, 30, 0.94)' }
  }

  // 界面手感：标题、侧栏灵感池、工作区图标
  // 开机预热桌宠笑声：2.7MB 的 wav 第一次点开时还没进缓存，主线程一忙就会中途卡一下
  try {
    for (const audioUrl of [
      '/dsh-naiwa/assets/audio/laugh-synced.wav?v=1',
      '/dsh-naiwa/assets/audio/click.wav',
    ]) {
      fetch(audioUrl, { cache: 'force-cache' }).catch(function () {})
      const warm = new Audio()
      warm.preload = 'auto'
      warm.muted = true
      warm.src = audioUrl
      warm.load()
    }
  } catch (err) { /* 预热失败不影响任何功能 */ }

  cleanup.push(installStudioChrome(studioCtx))
  // dsh-meme 每次升级都会把「大肥鱼/鲸鱼娘」内置图库装回来并默认启用。
  // 这里在启动时把内置包统一关掉，只留用户自己的包（source === 'user'）。
  setTimeout(function () { muteBuiltinMemePacks() }, 1200)
  // 首次运行把自家壁纸登记进 dsh-plugin-wallpaper-engine（它只认自己 upload 接口登记过的条目）
  setTimeout(function () { installEngineSkin() }, 1800)
  setTimeout(function () { migrateWallpapersToEngine() }, 2500)

  // 蛙的 canvas 是个大矩形，四周全是透明像素。透明区域要能穿透到下面的界面，
  // 否则鼠标一进这块就变成抓手、点什么都点不动。做法：跟着指针实时开关 pointer-events。
  const installPetHitArea = () => {
    if (typeof document === 'undefined') return () => {}
    const petOf = () => document.querySelector('canvas.naiwa-pet, .naiwa-pet')

    // 逐像素 getImageData 太贵，鼠标一动就卡。改成：整张缩到 32x32 采一次，
    // 缓存一秒，命中判断只查这张小表。
    const N = 32
    let mask = null
    let maskKey = ''
    let maskAt = 0
    let probe = null

    const buildMask = (canvas) => {
      const key = canvas.width + 'x' + canvas.height
      const now = performance.now()
      if (mask && maskKey === key && now - maskAt < 1000) return mask
      try {
        if (!probe) {
          probe = document.createElement('canvas')
          probe.width = N
          probe.height = N
        }
        const ctx = probe.getContext('2d', { willReadFrequently: true })
        ctx.clearRect(0, 0, N, N)
        ctx.drawImage(canvas, 0, 0, N, N)
        const data = ctx.getImageData(0, 0, N, N).data
        const bits = new Uint8Array(N * N)
        for (let i = 0; i < N * N; i += 1) bits[i] = data[i * 4 + 3] > 24 ? 1 : 0
        mask = bits
        maskKey = key
        maskAt = now
      } catch {
        mask = null
      }
      return mask
    }

    const solidAt = (canvas, x, y) => {
      const bits = buildMask(canvas)
      if (!bits) return true
      const box = canvas.getBoundingClientRect()
      if (box.width < 8 || box.height < 8) return false
      const gx = Math.min(N - 1, Math.max(0, Math.floor(((x - box.left) / box.width) * N)))
      const gy = Math.min(N - 1, Math.max(0, Math.floor(((y - box.top) / box.height) * N)))
      // 周围一格也算，边缘不容易发飘
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = gx + dx
          const ny = gy + dy
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue
          if (bits[ny * N + nx]) return true
        }
      }
      return false
    }

    const sync = (event) => {
      const canvas = petOf()
      if (!canvas || typeof canvas.getBoundingClientRect !== 'function') return
      // 按住不放的时候别改，避免把进行中的拖拽打断
      if (event && event.buttons) return
      if (!event) {
        canvas.style.cursor = 'default'
        return
      }
      const box = canvas.getBoundingClientRect()
      const inside =
        event.clientX >= box.left &&
        event.clientX <= box.right &&
        event.clientY >= box.top &&
        event.clientY <= box.bottom
      const solid = inside && solidAt(canvas, event.clientX, event.clientY)
      const want = solid ? 'grab' : 'default'
      if (canvas.style.cursor !== want) canvas.style.cursor = want
      // 只有压在蛙身上时 canvas 才接收事件，其余透明区一律穿透给下面的界面。
      // 按住不放时不切换，否则进行中的拖拽会被打断。
      const pe = solid ? 'auto' : 'none'
      if (canvas.style.pointerEvents !== pe) canvas.style.pointerEvents = pe
    }

    // 每次 mousemove 都 querySelector + getBoundingClientRect 会造成布局抖动，
    // 拖动时尤其明显。这里缓存元素、按 rAF 节流，拖动中直接跳过。
    let cachedCanvas = null
    let rafPending = false
    let lastEvent = null
    const flush = () => {
      rafPending = false
      if (!lastEvent) return
      const ev = lastEvent
      lastEvent = null
      sync(ev)
    }
    const setDragging = (on) => {
      document.body.classList.toggle('naiwa-dragging', on)
    }
    const onDownFlag = (event) => setDragging(true)
    const onUpFlag = () => setDragging(false)
    window.addEventListener('pointerdown', onDownFlag, true)
    window.addEventListener('pointerup', onUpFlag, true)
    window.addEventListener('pointercancel', onUpFlag, true)
    window.addEventListener('blur', onUpFlag)
    cleanup.push(() => {
      window.removeEventListener('pointerdown', onDownFlag, true)
      window.removeEventListener('pointerup', onUpFlag, true)
      window.removeEventListener('pointercancel', onUpFlag, true)
      window.removeEventListener('blur', onUpFlag)
      document.body.classList.remove('naiwa-dragging')
    })
    const onMove = (event) => {
      if (event.buttons) return
      if (!cachedCanvas || !cachedCanvas.isConnected) cachedCanvas = petOf()
      if (!cachedCanvas) return
      lastEvent = event
      if (rafPending) return
      rafPending = true
      requestAnimationFrame(flush)
    }
    const onLeave = () => {
      const canvas = petOf()
      if (canvas) canvas.style.cursor = 'default'
    }

    // 之前这里有一层「越界就吞掉 pointermove」的护栏：它会让他们的引擎
    // 丢掉位移量，越拖越偏、最后整层被卸载。已整段移除，边界交还给他们自己。

    document.addEventListener('pointermove', onMove, true)
    document.addEventListener('pointerleave', onLeave, true)
    window.addEventListener('blur', onLeave)

    // 按下时如果落点在透明像素上：把 canvas 的 pointer-events 关掉，再把这一次
    // pointerdown 转给底下真正该接收的元素。关掉之后浏览器会把后续的
    // move/up/click 直接派给下面那个元素，所以不用自己合成整串事件。
    let passThrough = false
    const restorePe = () => {
      if (!passThrough) return
      passThrough = false
      const c = petOf()
      if (c) c.style.pointerEvents = ''
    }
    const onDownCapture = (event) => {
      if (event.button !== 0) return
      const canvas = petOf()
      if (!canvas || event.target !== canvas) return
      if (solidAt(canvas, event.clientX, event.clientY)) return
      passThrough = true
      canvas.style.pointerEvents = 'none'
      const under = document.elementFromPoint(event.clientX, event.clientY)
      if (!under) { restorePe(); return }
      // 原始事件的 target 已经是 canvas，浏览器不会再改派，只能自己补一发
      event.stopPropagation()
      const clone = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        isPrimary: event.isPrimary,
        button: 0,
        buttons: 1,
      })
      under.dispatchEvent(clone)
    }
    const onUpCapture = () => {
      if (!passThrough) return
      // 留一帧，让浏览器把这一手的 up/click 派完再恢复
      setTimeout(restorePe, 0)
    }
    document.addEventListener('pointerdown', onDownCapture, true)
    window.addEventListener('pointerup', onUpCapture, true)
    window.addEventListener('pointercancel', onUpCapture, true)

    // 刚挂上时先让它可点，指针一进来就会被重新判定
    sync(null)

    return () => {
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerleave', onLeave, true)
      window.removeEventListener('blur', onLeave)
      document.removeEventListener('pointerdown', onDownCapture, true)
      window.removeEventListener('pointerup', onUpCapture, true)
      window.removeEventListener('pointercancel', onUpCapture, true)
      restorePe()
      const canvas = petOf()
      if (canvas) canvas.style.cursor = 'default'
    }
  }
  // 他们的引擎自己就带 isOpaque 判定，这层 pointer-events 切换是冗余的；
    // 一旦掩膜取样失败就会把整只蛙变成 click-through，表现为“被空气墙挡住”。
    // 先关掉，回到引擎原生行为。
    cleanup.push(installPetHitArea())

  // dsh-naiwa 那只蛙：按住拖到窗口边缘松手 → 弹成桌面小窗
  // popout 的边缘检测会在拖动时抢指针事件，先整体停用
    if (false) cleanup.push(setupPopOut())

  return () => {
    cleanup.forEach((fn) => {
      try {
        fn()
      } catch {
        /* 卸载失败不影响其它清理 */
      }
    })
  }
}

/**
 * 把 dsh-naiwa 那只蛙「拖出客户端」。
 *
 * 他们的宠物是渲染在页面里的一个 overlay 层（`[data-dsh-naiwa="layer"]`）。
 * 拖到窗口边缘松手时，用 documentPictureInPicture 开一个独立的系统小窗，
 * 把整层搬进去——动画/物理/音效都还在同一个 JS 上下文里跑，不用重写渲染。
 * 关掉小窗就自动搬回来。
 */
function setupPopOut() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => {}
  if (!('documentPictureInPicture' in window)) return () => {}

  const EDGE = 22
  const LAYER = '[data-dsh-naiwa="layer"]'
  let dragging = false
  let nearEdge = false
  let edgeTimer = 0
  let pipWin = null
  let home = null

  const findLayer = (root) => {
    try {
      return (root || document).querySelector(LAYER)
    } catch {
      return null
    }
  }

  // canvas 里蛙只占中间一块，四周全是透明。先判断「按下去的地方到底是不是蛙」，
  // 否则空白区域也会把蛙抓起来。
  const opaqueAt = (x, y) => {
    const canvas = document.querySelector('canvas.naiwa-pet, .naiwa-pet')
    if (!canvas || typeof canvas.getContext !== 'function') return false
    const box = canvas.getBoundingClientRect()
    if (box.width < 10 || box.height < 10) return false
    if (x < box.left || x > box.right || y < box.top || y > box.bottom) return false
    const px = Math.floor(((x - box.left) / box.width) * canvas.width)
    const py = Math.floor(((y - box.top) / box.height) * canvas.height)
    try {
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      return ctx.getImageData(px, py, 1, 1).data[3] > 24
    } catch {
      return true
    }
  }

  const onDown = (event) => {
    // 蛙画在 canvas 上，上面还盖着页面自己的遮罩层，
    // 所以不用 event.target 判断，用包围盒 + 像素透明度做命中测试。
    if (!opaqueAt(event.clientX, event.clientY)) return
    dragging = true
    nearEdge = false
  }

  const onMove = (event) => {
    if (!dragging || pipWin) return
    const w = window.innerWidth
    const h = window.innerHeight
    const near =
      event.clientX < EDGE || event.clientY < EDGE || event.clientX > w - EDGE || event.clientY > h - EDGE
    if (near && !nearEdge) {
      nearEdge = true
      // 贴到边停一下就直接飞出去，不用先松手
      clearTimeout(edgeTimer)
      edgeTimer = setTimeout(() => {
        // 暂时不自动弹出：贴边是常见操作，误触发会让蛙"消失"在小窗里。
        // 想恢复时把下一行注释去掉即可。
        // if (dragging && nearEdge && !pipWin) popOut()
      }, 220)
    } else if (!near) {
      nearEdge = false
      clearTimeout(edgeTimer)
    }
  }

  const onUp = () => {
    if (!dragging) return
    dragging = false
    clearTimeout(edgeTimer)
    // 同上：松手时不自动弹窗
    nearEdge = false
  }

  const copyStyles = (targetDoc) => {
    Array.prototype.forEach.call(document.styleSheets, (sheet) => {
      try {
        const text = Array.prototype.map.call(sheet.cssRules, (rule) => rule.cssText).join('\n')
        const tag = targetDoc.createElement('style')
        tag.textContent = text
        targetDoc.head.appendChild(tag)
      } catch {
        /* 跨域样式表跳过 */
      }
    })
  }

  const popOut = () => {
    if (pipWin) return
    const layer = findLayer()
    if (!layer) return
    window.documentPictureInPicture
      .requestWindow({ width: 260, height: 340, disallowReturnToOpener: false })
      .then((win) => {
        pipWin = win
        home = { parent: layer.parentNode, next: layer.nextSibling, style: layer.getAttribute('style') || '' }

        const doc = win.document
        doc.title = '奶蛙'
        copyStyles(doc)

        const base = doc.createElement('style')
        base.textContent = [
          'html,body{margin:0;padding:0;height:100%;overflow:hidden;background:transparent;}',
          'body{background:radial-gradient(120% 90% at 50% 82%, #fff6d8 0%, #fffaf0 52%, #ffffff 100%);}',
          '.naiwa-layer{position:fixed !important;inset:0 !important;background:transparent !important;}'
        ].join('\n')
        doc.head.appendChild(base)

        doc.body.appendChild(layer)

        try {
          win.dispatchEvent(new Event('resize'))
          window.dispatchEvent(new Event('resize'))
        } catch {
          /* 忽略 */
        }

        // 层刚搬过去时尺寸还是 0，等布局稳定后再叫它重新夹一次边界，
        // 不然蛙会停在原窗口的坐标上（跑到小窗外面）。
        // 他们的引擎把蛙画在 canvas 上用绝对坐标，不会因为搬家就重新居中。
        // 于是给整层加一个位移，把蛙挪到小窗中间（引擎只改 canvas 的 transform，不动这层）。
        const recenter = () => {
          try {
            const pet = doc.querySelector('.naiwa-pet')
            if (!pet) return
            const box = pet.getBoundingClientRect()
            if (!box.width) return
            const dx = Math.round(win.innerWidth / 2 - (box.left + box.width / 2))
            const dy = Math.round(win.innerHeight / 2 - (box.top + box.height / 2))
            layer.style.transform = `translate(${dx}px, ${dy}px)`
          } catch {
            /* 忽略 */
          }
        }
        requestAnimationFrame(() => requestAnimationFrame(recenter))
        ;[120, 400, 900].forEach((delay) => setTimeout(recenter, delay))
        win.addEventListener('resize', recenter)

        win.addEventListener('pagehide', restore)
      })
      .catch((error) => {
        console.warn('[naiwa-skin] 弹出桌面窗口失败：' + (error && error.message ? error.message : error))
      })
  }

  const restore = () => {
    const layer = pipWin ? findLayer(pipWin.document) : null
    if (layer) {
      try {
        if (home && typeof home.style === 'string') layer.setAttribute('style', home.style)
        else layer.removeAttribute('style')
        if (home && home.parent) home.parent.insertBefore(layer, home.next)
        else document.body.appendChild(layer)
      } catch {
        /* 忽略 */
      }
    }
    pipWin = null
    home = null
    try {
      window.dispatchEvent(new Event('resize'))
    } catch {
      /* 忽略 */
    }
  }

  // 菜单里的「放到桌面」走事件，和拖到窗口边缘是同一个动作
  const onDeskToggle = () => {
    if (pipWin) restore()
    else popOut()
  }

  document.addEventListener('pointerdown', onDown, true)
  document.addEventListener('pointermove', onMove, true)
  document.addEventListener('pointerup', onUp, true)
  window.addEventListener('naiwa:desk-toggle', onDeskToggle)

  return () => {
    document.removeEventListener('pointerdown', onDown, true)
    document.removeEventListener('pointermove', onMove, true)
    document.removeEventListener('pointerup', onUp, true)
    window.removeEventListener('naiwa:desk-toggle', onDeskToggle)
    if (pipWin) restore()
  }
}

/** 插件入口。 */
let studioCtx = null

function apply(ctx) {
  studioCtx = ctx
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  const run = (fn, label) => {
    if (ctx && typeof ctx.effect === 'function') {
      try {
        return ctx.effect(fn, label)
      } catch {
        /* 老版本没有 effect 时退回直接执行 */
      }
    }
    const dispose = fn()
    return typeof dispose === 'function' ? dispose : () => {}
  }
  run(() => mount(), 'naiwa-studio: ui')
  // 官方主题层：比在 :root 里写 CSS 变量可靠得多（那是被 DSH 自己的样式盖掉的）。
  run(() => {
    if (!ctx || !ctx.theme || typeof ctx.theme.overrideTokens !== 'function') return () => {}
    if (WALL_OWNED_ELSEWHERE) return () => {}
    try {
      const tokens = {
        '--dsw-alias-bg-base': { light: 'rgba(255, 250, 240, 0.44)', dark: 'rgba(28, 24, 16, 0.62)' },
        '--dsw-alias-bg-layer-1': { light: 'rgba(255, 252, 246, 0.58)', dark: 'rgba(36, 31, 21, 0.76)' },
        '--dsw-alias-bg-layer-2': { light: 'rgba(255, 252, 246, 0.66)', dark: 'rgba(42, 36, 25, 0.88)' },
        '--dsw-alias-bg-layer-3': { light: 'rgba(255, 253, 249, 0.76)', dark: 'rgba(48, 41, 28, 0.92)' },
        '--dsw-alias-bg-module-platform': { light: 'rgba(255, 249, 232, 0.80)', dark: 'rgba(33, 28, 18, 0.86)' },
        '--dsw-alias-settings-card-fill': { light: 'rgba(255, 252, 246, 0.82)', dark: 'rgba(44, 38, 26, 0.86)' },
        '--dsw-alias-border-l1': { light: 'rgba(150, 108, 20, 0.16)', dark: 'rgba(255, 216, 140, 0.16)' },
        '--dsw-alias-border-l2': { light: 'rgba(150, 108, 20, 0.22)', dark: 'rgba(255, 216, 140, 0.24)' },
        '--dsw-alias-brand-primary': { light: '#d9a800', dark: '#f0c530' },
        '--dsw-alias-brand-text': { light: '#756000', dark: '#f7dc6b' },
        '--dsw-alias-button-primary-fill': { light: '#efc52f', dark: '#e8c135' },
        '--dsw-alias-button-primary-fill-hover': { light: '#d9ad00', dark: '#f5d253' },
        '--dsw-alias-interactive-bg-hover': { light: 'rgba(255, 214, 120, 0.34)', dark: 'rgba(255, 205, 90, 0.22)' },
        '--dsw-alias-interactive-bg-active': { light: 'rgba(255, 200, 61, 0.42)', dark: 'rgba(255, 205, 90, 0.30)' },
        '--dsw-specific-sidebar-fill': { light: 'rgba(255, 248, 224, 0.56)', dark: 'rgba(26, 22, 14, 0.82)' },
        '--dsw-specific-sidebar-item-hover': { light: 'rgba(225, 188, 38, 0.14)', dark: 'rgba(241, 201, 54, 0.10)' },
        '--dsw-specific-sidebar-item-active': { light: 'rgba(225, 188, 38, 0.24)', dark: 'rgba(241, 201, 54, 0.18)' },
        '--dsw-specific-bubble': { light: 'rgba(255, 249, 226, 0.92)', dark: 'rgba(44, 38, 24, 0.92)' },
        '--dsw-specific-input-major': { light: 'rgba(255, 255, 251, 0.94)', dark: 'rgba(38, 33, 23, 0.94)' }
      }
      THEME_LIGHT = tokens
      return ctx.theme.overrideTokens('naiwa-studio', tokens)
    } catch (error) {
      console.warn('[naiwa-skin] 主题 token 没盖上去：' + (error && error.message ? error.message : error))
      return () => {}
    }
  }, 'naiwa-studio: theme tokens')
}

exports.apply = apply
exports.inject = inject
return module.exports
  },
})
