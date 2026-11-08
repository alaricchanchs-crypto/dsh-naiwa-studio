/* 奶蛙启动动画运行时
   设计原则：
   1. 视频只负责 0–4.9s 的氛围；4.367s 的硬切用「压暗 + 故障」盖过去
   2. 4.9s 之后停在最后一帧，进度条和 SYSTEM READY 由真实启动状态驱动
   3. 任何异常都必须放行（最长 12s），绝不能把界面锁死 */
(function () {
  'use strict'

  var boot = document.getElementById('nb-boot')
  if (!boot) return

  var cfg = window.__NAIWA_BOOT__ || {}
  var CUT = typeof cfg.cut === 'number' ? cfg.cut : 4.367
  var DIM_AT_CUT = typeof cfg.dim === 'number' ? cfg.dim : 0.2803
  var DIM_RELEASE = 0.55
  var GL_START = CUT - 0.10
  var GL_END = CUT + 0.22
  var HOLD_FROM = typeof cfg.hold === 'number' ? cfg.hold : 5.62
  // 原片开头 0.9s 几乎纯黑，直接跳过，别让用户对着黑屏等
  var START_AT = typeof cfg.startAt === 'number' ? cfg.startAt : 0.9
  var MIN_MS = typeof cfg.minMs === 'number' ? cfg.minMs : 4000
  var MAX_MS = typeof cfg.maxMs === 'number' ? cfg.maxMs : 12000
  var SLOW_CAP = 7000
  var GLOW_END = CUT + 0.45

  var video = document.getElementById('nb-video')
  // 视频只有 5.6s，但语音排到 6.6s：播完以后用挂钟续上，画面定格
  var videoEndWall = 0
  video.addEventListener('ended', function () { if (!videoEndWall) videoEndWall = performance.now() })
  function timelineT() {
    if (videoEndWall) return (video.duration || 0) + (performance.now() - videoEndWall) / 1000
    return video.currentTime || 0
  }
  var fx = document.getElementById('nb-fx')
  var veil = document.getElementById('nb-veil')
  var glow = document.getElementById('nb-glow')
  var bar = document.querySelector('#nb-bar i')
  var status = document.getElementById('nb-status')
  var progress = document.getElementById('nb-progress')
  var pTl = document.getElementById('nb-p-tl')
  var pTr = document.getElementById('nb-p-tr')
  var pBl = document.getElementById('nb-p-bl')
  var pBr = document.getElementById('nb-p-br')
  var skip = document.getElementById('nb-skip')
  var frame = document.getElementById('nb-frame')

  // 视频是 16:9，画框按比例居中放大；叠加层跟着画框走，坐标才对得上
  function fitFrame() {
    if (!frame) return
    var vw = window.innerWidth
    var vh = window.innerHeight
    var ratio = 16 / 9
    var w = vw
    var h = w / ratio
    if (h > vh) {
      h = vh
      w = h * ratio
    }
    frame.style.width = w + 'px'
    frame.style.height = h + 'px'
    frame.style.left = Math.round((vw - w) / 2) + 'px'
    frame.style.top = Math.round((vh - h) / 2) + 'px'
  }
  fitFrame()
  window.addEventListener('resize', fitFrame)

  var started = Date.now()
  var finished = false
  var held = false
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  document.documentElement.classList.add('nb-lock')

  var LINES_TL = [
    'BOOT SEQUENCE',
    '<b>MEMBRANE</b> · sealing',
    'OCEAN BUS · idle',
    'SENSOR ARRAY · online'
  ]
  var LINES_TR = [
    'NAIWA HARNESS',
    '<b>VER</b> ' + escapeHtml(cfg.version || '0.1.0'),
    'MODEL · deepseek-flash',
    'MODE · awake'
  ]
  var LINES_BL = [
    'LOADING MEMBRANE...',
    'CORE TEMP · 24.0C',
    'HYDRATION · 87%',
    'TOAD LINK · stable'
  ]

  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  function fill(panel, lines) {
    if (!panel) return
    panel.innerHTML = lines.map(function (line, i) {
      if (i === 0) return '<div class="nb-title">' + line + '</div>'
      return '<div class="nb-line">' + line + '</div>'
    }).join('')
  }

  fill(pTl, LINES_TL)
  fill(pTr, LINES_TR)
  fill(pBl, LINES_BL)
  fill(pBr, ['SYSTEM READY', '<b>ALL SYSTEMS</b> · nominal', 'WARDEN · present', 'ENTERING HARNESS'])

  // —— 面板按时间依次亮起 ——
  // 四块面板跟四句语音对齐：开场两块先亮，
  // LOADING MEMBRANE 跟 vo-2（3.55），SYSTEM READY 跟 vo-4（6.60）
  // 跟画面对齐：0.8s 四块面板出现、3.30s 仓体升起、4.38s 睁眼、5.55s 系统就绪
  var PANEL_AT = [
    [0.80, pTl],   // 跟 vo-1 Initializing Naiwa → BOOT SEQUENCE
    [3.30, pBl],   // 跟 vo-2 Membrane sealed → LOADING MEMBRANE
    [4.38, pTr],   // 跟 vo-3 Naiwa awakening → NAIWA HARNESS
    [5.47, pBr]    // 跟 vo-4 Harness online → SYSTEM READY
  ]

  function pulse(t) {
    for (var i = 0; i < PANEL_AT.length; i += 1) {
      if (t >= PANEL_AT[i][0]) PANEL_AT[i][1].classList.add('nb-on')
    }
    if (window.__NB_DEBUG__) {
      // 调试探针：允许在控制台看时间线与九个 cue 的实际落点
      window.__NB_STATE__ = {
        t: Math.round(t * 100) / 100,
        fired: AUDIO_CUES.filter(function (c) { return c.done }).map(function (c) { return c.t }),
        panels: PANEL_AT.filter(function (p) { return p[1].classList.contains('nb-on') }).map(function (p) { return p[0] }),
        hold: HOLD_FROM,
        finished: finished
      }
    }
    if (t >= 0.9) progress.classList.add('nb-on')
    if (t >= 0.9 && skip) skip.classList.add('nb-show')
  }

  // —— 故障效果（与预览页同一套参数）——
  var ocWork = document.createElement('canvas')
  var ocR = document.createElement('canvas')
  var ocC = document.createElement('canvas')

  function rand(seed) {
    var x = Math.sin(seed * 12.9898) * 43758.5453
    return x - Math.floor(x)
  }

  function smooth(x) {
    x = Math.min(1, Math.max(0, x))
    return x * x * (3 - 2 * x)
  }

  function glitchAmount(t) {
    if (t < GL_START || t > GL_END) return 0
    var a
    if (t < CUT) a = smooth((t - GL_START) / (CUT - GL_START)) * 0.85
    else a = Math.pow(1 - (t - CUT) / (GL_END - CUT), 1.9)
    var burst = (t > CUT + 0.10 && t < CUT + 0.15) ? 0.35 : 0
    return Math.min(1, a + burst)
  }

  function channelPass(target, src, w, h, off, color, dx) {
    if (off.width !== w || off.height !== h) { off.width = w; off.height = h }
    var o = off.getContext('2d')
    o.globalCompositeOperation = 'source-over'
    o.globalAlpha = 1
    o.clearRect(0, 0, w, h)
    o.drawImage(src, 0, 0, w, h)
    o.globalCompositeOperation = 'multiply'
    o.fillStyle = color
    o.fillRect(0, 0, w, h)
    target.globalCompositeOperation = 'lighter'
    target.globalAlpha = 1
    target.drawImage(off, dx, 0, w, h)
  }

  function drawGlitch(t, amount) {
    var w = video.videoWidth || 1920
    var h = video.videoHeight || 1080
    if (fx.width !== w || fx.height !== h) { fx.width = w; fx.height = h }
    if (ocWork.width !== w || ocWork.height !== h) { ocWork.width = w; ocWork.height = h }
    var ctx = ocWork.getContext('2d')
    var frame = Math.floor(t * 30)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(video, 0, 0, w, h)

    var bands = 3 + Math.round(amount * 6)
    for (var i = 0; i < bands; i += 1) {
      if (rand(frame * 7.7 + i * 1.13) > 0.55) continue
      var by = Math.floor(rand(frame * 5.1 + i * 3.7) * h)
      var bh = Math.max(8, Math.floor((0.015 + rand(frame * 11.3 + i * 2.71) * 0.075) * h))
      var dx = (rand(frame * 2.3 + i * 4.4) - 0.5) * 150 * amount
      ctx.drawImage(video, 0, by, w, bh, dx, by, w, bh)
    }

    var lines = 1 + Math.round(amount * 2)
    for (var l = 0; l < lines; l += 1) {
      var ly = Math.floor(rand(frame * 9.7 + l * 5.3) * h)
      ctx.fillStyle = 'rgba(210,255,250,' + (0.25 + amount * 0.45) + ')'
      ctx.fillRect(0, ly, w, 1 + Math.round(rand(frame * 4.1 + l) * 2))
    }

    var blocks = Math.round(amount * 14)
    for (var b = 0; b < blocks; b += 1) {
      var bx = Math.floor(rand(frame * 13.7 + b * 2.9) * w)
      var byy = Math.floor(rand(frame * 17.3 + b * 1.7) * h)
      var bw = Math.floor(10 + rand(frame * 3.3 + b) * 60)
      var bh2 = Math.floor(2 + rand(frame * 6.1 + b) * 8)
      ctx.fillStyle = rand(frame + b) > 0.45
        ? 'rgba(235,255,252,' + (0.08 + amount * 0.22) + ')'
        : 'rgba(255,50,95,' + (0.06 + amount * 0.18) + ')'
      ctx.fillRect(bx, byy, bw, bh2)
    }

    var out = fx.getContext('2d')
    out.setTransform(1, 0, 0, 1, 0, 0)
    out.globalCompositeOperation = 'source-over'
    out.globalAlpha = 1
    out.clearRect(0, 0, w, h)
    var split = 5 + 12 * amount
    channelPass(out, ocWork, w, h, ocR, '#ff0000', -split)
    channelPass(out, ocWork, w, h, ocC, '#00ffff', split)
    out.globalCompositeOperation = 'source-over'
  }

  function renderOverlay(t) {
    // 压暗幕
    var ve = 0
    if (t >= CUT) {
      var k = (t - CUT) / DIM_RELEASE
      ve = k >= 1 ? 0 : DIM_AT_CUT * (1 - smooth(k))
    }
    veil.style.opacity = ve

    // 眼部余晖
    var gl = 0
    if (t >= CUT) {
      var kg = (t - CUT) / (GLOW_END - CUT)
      gl = kg >= 1 ? 0 : Math.pow(1 - kg, 1.6) * 0.10
    }
    glow.style.opacity = gl

    var amount = glitchAmount(t)
    if (amount > 0.01 && video.readyState >= 2) {
      try {
        drawGlitch(t, amount)
        fx.style.display = 'block'
        video.style.visibility = 'hidden'
        return
      } catch (e) {
        /* 画不出来就退回原片，不影响播放 */
      }
    }
    fx.style.display = 'none'
    video.style.visibility = 'visible'
  }

  // —— 真实启动状态 ——
  function appReady() {
    var root = document.getElementById('root')
    if (!root || root.childElementCount === 0) return false
    if (!document.querySelector('[class*="_sidebarCol"]')) return false
    return true
  }

  function reveal(reason) {
    if (finished) return
    finished = true
    window.__NAIWA_SPLASH_DONE__ = true
    try { video.pause() } catch (e) {}
    boot.classList.add('nb-out')
    document.documentElement.classList.remove('nb-lock')
    setTimeout(function () {
      if (boot && boot.parentNode) boot.parentNode.removeChild(boot)
      document.dispatchEvent(new CustomEvent('naiwa-splash:done', { detail: { reason: reason } }))
    }, 460)
  }

  function tick() {
    if (finished) return
    var t = timelineT()
    var elapsed = Date.now() - started

    if (!reduced) {
      renderOverlay(t)
      pulse(t)
      fireCues(t)
    }

    // 进度：3.2s 前用时间假装，之后看真实状态
    if (skip && video.duration) {
      skip.querySelector('i').style.setProperty('--p', (Math.min(1, t / video.duration) * 100).toFixed(1) + '%')
    }
    var fake = Math.min(0.92, elapsed / Math.max(MIN_MS, 1))
    bar.style.width = (fake * 100).toFixed(1) + '%'

    if ((t >= HOLD_FROM || video.ended) && !held) {
      held = true
      // 不要在这里 seek/暂停：headless 与部分显卡上会卡在旧帧。
      // 让它自然播到最后一帧停住就行。
      status.textContent = 'WAITING FOR HARNESS'
      pBr.classList.add('nb-on')
    }

    // 放行条件：应用已就绪 + 至少过了 MIN_MS + 视频时间线走完（或机器太慢兜底）
    // 视频只有 5.6s，时间线会用挂钟续到 HOLD_FROM；
    // 不能用 video.ended 放行，否则第四句（6.60s）还没出来就被揭幕切掉了。
    var timelineDone = t >= HOLD_FROM || elapsed >= 9000
    var ready = appReady() && elapsed >= MIN_MS && timelineDone
    if (ready) {
      bar.style.width = '100%'
      status.textContent = 'SYSTEM READY · ENTERING'
      pBr.classList.add('nb-on')
      setTimeout(function () { reveal('ready') }, 320)
      return
    }

    if (elapsed >= MAX_MS) {
      bar.style.width = '100%'
      status.textContent = 'SAFE EXIT'
      reveal('timeout')
      return
    }

    requestAnimationFrame(tick)
  }

  // ---- 声音 ----
  // 参考素材（用户给的 11月7日(6).mp3）实测特征：能量集中在 100–400Hz 的嗡嗡谐波，
  // 全片铺满 0.2–0.5s 一次的宽带电流噼啪。所以这套声音的主干是「电流」，不是「配乐」。
  var MUTE_KEY = 'dsh-naiwa:boot-mute'
  var muted = false
  try { muted = localStorage.getItem(MUTE_KEY) === '1' } catch (e) {}
  var AC = null
  var master = null
  var wet = null
  var probe = null
  var lineBuffers = {}

  function ensureAudio() {
    if (AC) return AC
    var Ctor = window.AudioContext || window.webkitAudioContext
    if (!Ctor) return null
    try {
      AC = new Ctor()

      master = AC.createGain()
      master.gain.value = muted ? 0 : 0.82

      var comp = AC.createDynamicsCompressor()
      comp.threshold.value = -9
      comp.knee.value = 12
      comp.ratio.value = 4.5
      comp.attack.value = 0.003
      comp.release.value = 0.2
      master.connect(comp)
      comp.connect(AC.destination)

      // 混响：噪声激励的指数衰减脉冲，给声音一点「机房空间」
      var len = Math.floor(AC.sampleRate * 1.7)
      var ir = AC.createBuffer(2, len, AC.sampleRate)
      for (var ch = 0; ch < 2; ch += 1) {
        var d = ir.getChannelData(ch)
        for (var i = 0; i < len; i += 1) {
          var decay = Math.pow(1 - i / len, 2.2)
          d[i] = (Math.random() * 2 - 1) * decay * 0.7
        }
      }
      var conv = AC.createConvolver()
      conv.buffer = ir
      wet = AC.createGain()
      wet.gain.value = 0.34
      wet.connect(conv)
      conv.connect(master)

      probe = AC.createAnalyser()
      probe.fftSize = 2048
      master.connect(probe)
    } catch (e) {
      AC = null
    }
    return AC
  }

  function send(node, dry, rev) {
    var d = AC.createGain()
    d.gain.value = dry
    node.connect(d)
    d.connect(master)
    if (rev > 0 && wet) {
      var r = AC.createGain()
      r.gain.value = rev
      node.connect(r)
      r.connect(wet)
    }
  }

  function noiseBuffer(seconds) {
    var len = Math.floor(AC.sampleRate * seconds)
    var buf = AC.createBuffer(1, len, AC.sampleRate)
    var data = buf.getChannelData(0)
    for (var i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1
    return buf
  }

  function toneAt(when, freq, dur, type, peak, glideTo, rev) {
    var osc = AC.createOscillator()
    var gain = AC.createGain()
    osc.type = type || 'sine'
    osc.frequency.setValueAtTime(freq, when)
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, when + dur)
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(peak, when + Math.min(0.06, dur * 0.2))
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    osc.connect(gain)
    send(gain, 1, rev || 0)
    osc.start(when)
    osc.stop(when + dur + 0.05)
  }

  function noiseAt(when, dur, peak, filterType, from, to, q, rev) {
    var src = AC.createBufferSource()
    src.buffer = noiseBuffer(dur + 0.1)
    var filter = AC.createBiquadFilter()
    filter.type = filterType || 'lowpass'
    filter.frequency.setValueAtTime(from, when)
    if (to) filter.frequency.exponentialRampToValueAtTime(to, when + dur)
    filter.Q.value = q || 1
    var gain = AC.createGain()
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(peak, when + Math.min(0.1, dur * 0.25))
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    src.connect(filter)
    filter.connect(gain)
    send(gain, 1, rev || 0)
    src.start(when)
    src.stop(when + dur + 0.05)
  }

  // —— ① 电台底：沙沙 + 场强起伏 + 极轻垫底和弦 + 偶发静噪 ——
  function radioBed(when, dur) {
    // 沙沙：带通白噪（收音机没调准台那种）
    var src = AC.createBufferSource()
    src.buffer = noiseBuffer(dur + 0.2)
    src.loop = true
    var bp = AC.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1500
    bp.Q.value = 0.55
    var hissGain = AC.createGain()
    hissGain.gain.setValueAtTime(0.0001, when)
    hissGain.gain.linearRampToValueAtTime(0.017, when + 0.7)
    hissGain.gain.setValueAtTime(0.017, when + dur - 0.8)
    hissGain.gain.linearRampToValueAtTime(0.0001, when + dur)
    src.connect(bp)
    bp.connect(hissGain)
    send(hissGain, 1, 0.12)

    // 场强起伏：两条慢速 LFO 相乘，信号忽强忽弱
    ;[0.13, 0.37].forEach(function (f, i) {
      var lfo = AC.createOscillator()
      var depth = AC.createGain()
      lfo.frequency.value = f
      depth.gain.value = i === 0 ? 0.007 : 0.005
      lfo.connect(depth)
      depth.connect(hissGain.gain)
      lfo.start(when)
      lfo.stop(when + dur)
    })
    src.start(when)
    src.stop(when + dur)

    // 极轻的垫底和弦：只听出「有节目」，听不清旋律
    ;[[196, 0.009], [247, 0.007], [294, 0.006], [392, 0.004]].forEach(function (p, i) {
      var osc = AC.createOscillator()
      var gain = AC.createGain()
      var trem = AC.createOscillator()
      var tremDepth = AC.createGain()
      osc.type = 'sine'
      osc.frequency.value = p[0]
      trem.frequency.value = 0.09 + i * 0.02
      tremDepth.gain.value = p[1] * 0.4
      trem.connect(tremDepth)
      tremDepth.connect(gain.gain)
      gain.gain.setValueAtTime(0.0001, when)
      gain.gain.linearRampToValueAtTime(p[1], when + 1.0)
      gain.gain.setValueAtTime(p[1], when + dur - 0.9)
      gain.gain.linearRampToValueAtTime(0.0001, when + dur)
      var lp = AC.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 900
      osc.connect(lp)
      lp.connect(gain)
      send(gain, 1, 0.25)
      osc.start(when)
      trem.start(when)
      osc.stop(when + dur)
      trem.stop(when + dur)
    })

    // 静噪爆点：调台时那种「嚓」一下
    var t = when + 0.6
    while (t < when + dur - 0.6) {
      if (Math.random() > 0.45) {
        noiseAt(t, 0.03 + Math.random() * 0.06, 0.05 + Math.random() * 0.09, 'bandpass', 700, 3200, 1.2, 0.3)
      }
      t += 0.35 + Math.random() * 0.9
    }
  }

  // 电弧：2–6ms 的尖脉冲，偶尔来一下大的（scale 控制强度）
  function arc(when, peak) {
    noiseAt(when, 0.006 + Math.random() * 0.008, peak, 'highpass', 1600, 5200, 0.8, 0.22)
    if (peak > 0.12) noiseAt(when, 0.02, peak * 0.5, 'bandpass', 900, 1500, 1.6, 0.3)
  }

  function arcTrain(when, dur, scale) {
    var k = scale === undefined ? 1 : scale
    var t = when
    while (t < when + dur) {
      var r = Math.random()
      var peak = (r > 0.94 ? 0.16 + Math.random() * 0.12 : 0.02 + r * 0.06) * k
      arc(t, peak)
      t += 0.09 + Math.random() * 0.22
    }
  }

  // —— ② 仪表盘电子音 ——
  function blip(when, freq) {
    var osc = AC.createOscillator()
    var gain = AC.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(freq, when)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.58, when + 0.06)
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(0.06, when + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.09)
    var lp = AC.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 3400
    osc.connect(lp)
    lp.connect(gain)
    send(gain, 1, 0.4)
    osc.start(when)
    osc.stop(when + 0.12)
  }

  function powerOn(when) {
    toneAt(when, 62, 0.6, 'sine', 0.34, 30, 0.3)
    noiseAt(when, 0.2, 0.16, 'lowpass', 1400, 160, 1.1, 0.35)
    arc(when + 0.03, 0.2)
  }

  function whoosh(when, dur, peak) {
    noiseAt(when, dur, peak, 'bandpass', 220, 4600, 3.2, 0.45)
    toneAt(when, 140, dur, 'sawtooth', 0.035, 520, 0.3)
  }

  function impact(when) {
    toneAt(when, 86, 0.6, 'sine', 0.5, 26, 0.5)
    noiseAt(when, 0.4, 0.4, 'lowpass', 4200, 200, 1.0, 0.55)
    noiseAt(when + 0.01, 0.14, 0.28, 'highpass', 2400, 7000, 1, 0.35)
    arc(when + 0.02, 0.3)
    arc(when + 0.09, 0.2)
  }

  function shimmer(when) {
    ;[1720, 2410, 3170, 4210].forEach(function (f, i) {
      toneAt(when + i * 0.045, f, 0.42 - i * 0.05, 'sine', 0.03 + i * 0.004, null, 0.5)
    })
  }

  function chime(when) {
    ;[1320, 1760, 2640].forEach(function (f, i) {
      toneAt(when + i * 0.05, f, 0.6 - i * 0.08, 'sine', 0.075 - i * 0.015, null, 0.55)
    })
    toneAt(when, 660, 0.5, 'triangle', 0.035, 640, 0.4)
  }

  // —— ③ 人声：vo-1..4 + 本项目合成的两次点击音 ——
  // 他们那六句是第三方影片素材，这里只做轻度 EQ + 混响，保持原声的质感。
  function playLine(name, when, level) {
    var buf = lineBuffers[name]
    if (!buf) return
    var src = AC.createBufferSource()
    src.buffer = buf
    var hp = AC.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 90          // 只去隆隆，不切低中频
    var gain = AC.createGain()
    gain.gain.value = level || 0.95
    src.connect(hp)
    hp.connect(gain)
    gain.connect(master)             // 干声直出，不挂混响：AI 应该贴耳、无空间感
    src.start(when)
  }

  function playSfx(name, when, level) {
    var buf = lineBuffers[name]
    if (!buf) return
    var src = AC.createBufferSource()
    src.buffer = buf
    var gain = AC.createGain()
    gain.gain.value = level || 0.5
    src.connect(gain)
    send(gain, 1, 0.2)
    src.start(when)
  }

  function loadLines() {
    ensureAudio()
    if (!AC) return
    var names = [['vo-1', 'wav'], ['vo-2', 'wav'], ['vo-3', 'wav'], ['vo-4', 'wav'], ['sfx-tick', 'mp3'], ['sfx-ticks-run', 'mp3']]
    names.forEach(function (pair) {
      var name = pair[0], ext = pair[1]
      var url = (window.__NAIWA_BOOT_BASE__ || '/dsh-naiwa-studio/startup/') + name + '.' + ext
      fetch(url)
        .then(function (r) { return r.ok ? r.arrayBuffer() : null })
        .then(function (data) {
          if (!data) return null
          return new Promise(function (resolve) {
            AC.decodeAudioData(data, resolve, function () { resolve(null) })
          })
        })
        .then(function (buf) { if (buf) lineBuffers[name] = buf })
        .catch(function () {})
    })
  }

  // 相对视频 currentTime 的触发点
  // 伺服锁扣：第三句开口前那声"模块切换"
  function servoClick(when) {
    noiseAt(when, 0.004, 0.34, 'highpass', 3200, 8000, 0.9, 0.1)          // 咔
    toneAt(when + 0.002, 2480, 0.05, 'square', 0.10, null, 0.06)         // 金属齿
    toneAt(when + 0.006, 61, 0.16, 'sine', 0.30, 44, 0.1)                // 低频压一下
    noiseAt(when + 0.05, 0.09, 0.06, 'bandpass', 900, 1600, 1.8, 0.12)   // 余音
  }

  var AUDIO_CUES = [
    { t: 0.50, done: false, run: function (when) { powerOn(when); radioBed(when, 5.2) } },
    { t: 0.55, done: false, run: function (when) { playSfx('sfx-ticks-run', when, 0.22); arcTrain(when, 4.0, 0.55) } },
    { t: 0.80, done: false, run: function (when) { playLine('vo-1', when, 0.82) } },
    { t: 1.60, done: false, run: function (when) { whoosh(when, 0.5) } },
    { t: 2.65, done: false, run: function (when) { whoosh(when, 0.55) } },
    { t: 3.30, done: false, run: function (when) { playLine('vo-2', when, 0.82) } },
    { t: 3.90, done: false, run: function (when) { shimmer(when, 0.5) } },
    { t: 4.28, done: false, run: function (when) { impact(when, 0.7) } },
    { t: 4.305, done: false, run: function (when) { servoClick(when, 0.5) } },
    { t: 4.38, done: false, run: function (when) { playLine('vo-3', when, 0.84) } },
    { t: 5.47, done: false, run: function (when) { playLine('vo-4', when, 0.84) } },
    { t: 5.50, done: false, run: function (when) { chime(when, 0.5); playSfx('sfx-tick', when, 0.3) } }
  ]

  function fireCues(t) {
    if (!AC || AC.state === 'suspended') return
    for (var i = 0; i < AUDIO_CUES.length; i += 1) {
      var cue = AUDIO_CUES[i]
      if (cue.done || t < cue.t) continue
      cue.done = true
      if (t - cue.t > 0.6) continue
      try { cue.run(AC.currentTime + 0.02) } catch (e) {}
    }
  }

  function toggleMute() {
    muted = !muted
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0') } catch (e) {}
    if (master) master.gain.value = muted ? 0 : 0.82
    status.textContent = muted ? 'SOUND OFF' : 'INITIALIZING'
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'm' || e.key === 'M') toggleMute()
  })
  ;['pointerdown', 'keydown'].forEach(function (type) {
    document.addEventListener(type, function () {
      ensureAudio()
      if (AC && AC.state === 'suspended') AC.resume()
    }, { once: true })
  })
  loadLines()

  // 调试探针：headless 里没法听，只能靠这个看音频状态
  window.__NB_AUDIO__ = function () {
    var peak = 0
    if (probe) {
      var data = new Float32Array(probe.fftSize)
      probe.getFloatTimeDomainData(data)
      for (var i = 0; i < data.length; i += 1) {
        var v = Math.abs(data[i])
        if (v > peak) peak = v
      }
    }
    return {
      ctx: !!AC,
      state: AC ? AC.state : 'none',
      voices: Object.keys(lineBuffers).length,
      muted: muted,
      peak: +peak.toFixed(3),
      fired: AUDIO_CUES.filter(function (c) { return c.done }).length
    }
  }

  function skipNow() {
    status.textContent = 'SKIPPED'
    reveal('skip')
  }

  if (skip) skip.addEventListener('click', skipNow)
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') skipNow()
  })

  // 视频加载失败：0.8s 后直接放行，别让用户盯着黑屏
  video.addEventListener('error', function () { setTimeout(skipNow, 800) })

  video.addEventListener('loadeddata', function () {
    if (reduced) { skipNow(); return }
    try {
      if (video.currentTime < START_AT - 0.05) video.currentTime = START_AT
    } catch (e) { /* seek 失败就从头放 */ }
    var playPromise = video.play()
    if (playPromise && playPromise.catch) playPromise.catch(function () { /* 自动播放被拒就静态展示 */ })
    requestAnimationFrame(tick)
  })

  // 兜底：即使视频一直没 loadeddata，也保证 12s 内放行
  setTimeout(function () { if (!finished) skipNow() }, MAX_MS + 500)
})()
