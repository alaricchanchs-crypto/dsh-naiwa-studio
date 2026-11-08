import { appendFileSync, createReadStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-naiwa-studio'

export const inject = ['webServer']

const HERE = dirname(fileURLToPath(import.meta.url))
const STARTUP_DIR = join(HERE, '..', 'assets', 'startup')
const STARTUP_TYPES = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.json': 'application/json; charset=utf-8'
}
const STARTUP_BOOT = {
  cut: 4.367,
  dim: 0.2803,
  hold: 5.62,
  minMs: 4000,
  maxMs: 12000,
  version: '0.1.0'
}

const BG_DIR = join(homedir(), '.dsh', 'naiwa-backgrounds')
const BG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const ROUTE_PREFIX = '/dsh-naiwa-studio'

async function listBackgrounds() {
  let names = []
  try {
    names = await readdir(BG_DIR)
  } catch {
    return []
  }
  const items = []
  for (const fileName of names) {
    const ext = extname(fileName).toLowerCase()
    if (!BG_EXT.has(ext)) continue
    const full = join(BG_DIR, fileName)
    try {
      const info = await stat(full)
      if (!info.isFile()) continue
      items.push({
        name: fileName,
        url: `${ROUTE_PREFIX}/bg/${encodeURIComponent(fileName)}`,
        mtime: info.mtimeMs
      })
    } catch {
      /* 单个文件读不到就跳过 */
    }
  }
  items.sort((a, b) => b.mtime - a.mtime)
  return items
}

function sendJson(res, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body)
  })
  res.end(body)
}

function serveBackground(req, res, pathname) {
  const raw = decodeURIComponent(pathname.slice(`${ROUTE_PREFIX}/bg/`.length))
  const fileName = raw.replace(/^.*[\\/]/, '')
  const ext = extname(fileName).toLowerCase()
  if (!fileName || !BG_EXT.has(ext)) {
    res.writeHead(404).end('not found')
    return
  }
  const full = join(BG_DIR, fileName)
  if (!existsSync(full)) {
    res.writeHead(404).end('not found')
    return
  }
  const type = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
  res.writeHead(200, {
    'content-type': type,
    'cache-control': 'public, max-age=86400'
  })
  createReadStream(full).pipe(res)
}

const MAX_UPLOAD = 24 * 1024 * 1024

function sanitizeName(raw) {
  const base = String(raw ?? '')
    .replace(/^.*[\\/]/, '')
    .replace(/[^\w.\-\u4e00-\u9fa5]/g, '_')
    .slice(-80)
  const ext = extname(base).toLowerCase()
  if (!BG_EXT.has(ext)) return null
  const stem = base.slice(0, base.length - ext.length) || 'wallpaper'
  return `${stem}${ext}`
}

async function readBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_UPLOAD) throw new Error('too large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function saveUpload(req) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const wanted = sanitizeName(url.searchParams.get('name') ?? req.headers['x-filename'])
  if (wanted === null) return { ok: false, status: 400, error: 'unsupported file type' }
  const body = await readBody(req)
  if (body.length === 0) return { ok: false, status: 400, error: 'empty body' }
  await mkdir(BG_DIR, { recursive: true })
  const ext = extname(wanted)
  const stem = wanted.slice(0, wanted.length - ext.length)
  let fileName = wanted
  let counter = 2
  while (existsSync(join(BG_DIR, fileName))) {
    fileName = `${stem}-${counter}${ext}`
    counter += 1
  }
  await writeFile(join(BG_DIR, fileName), body)
  return { ok: true, name: fileName, url: `${ROUTE_PREFIX}/bg/${encodeURIComponent(fileName)}` }
}

// 删除一张壁纸：只接受纯文件名 + 白名单后缀，挡住 ../ 之类的穿越
async function deleteBackground(req) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const wanted = sanitizeName(url.searchParams.get('name') ?? '')
  if (wanted === null) return { ok: false, status: 400, error: 'unsupported file type' }
  const full = join(BG_DIR, wanted)
  if (!existsSync(full)) return { ok: false, status: 404, error: 'not found' }
  try {
    await unlink(full)
  } catch (error) {
    return { ok: false, status: 500, error: String(error?.message ?? error) }
  }
  return { ok: true, name: wanted }
}

function safeRegister(ctx, route) {
  // 万一插件被挂了两份（entry 重复），别让 route 冲突把整个插件打挂。
  try {
    ctx.webServer.register(route)
  } catch (error) {
    console.warn('[dsh-naiwa-studio] route skipped:', route.path, String(error?.message ?? error))
  }
}

function serveStartup(req, res, pathname) {
  const raw = decodeURIComponent(pathname.slice(`${ROUTE_PREFIX}/startup/`.length))
  const fileName = raw.replace(/^.*[\\/]/, '')
  const ext = extname(fileName).toLowerCase()
  if (!fileName || !STARTUP_TYPES[ext]) {
    res.writeHead(404).end('not found')
    return
  }
  const full = join(STARTUP_DIR, fileName)
  if (!existsSync(full)) {
    res.writeHead(404).end('not found')
    return
  }
  const type = STARTUP_TYPES[ext]
  const size = statSync(full).size
  const range = String(req.headers.range ?? '')
  const matched = /^bytes=(\d*)-(\d*)$/.exec(range)
  // <video> 要能 seek 就必须支持 Range，否则某些情况下只能拿到黑帧
  if (matched) {
    let start = matched[1] === '' ? null : Number(matched[1])
    let end = matched[2] === '' ? null : Number(matched[2])
    if (start === null && end === null) {
      res.writeHead(416, { 'content-range': `bytes */${size}` }).end()
      return
    }
    if (start === null) {
      start = Math.max(0, size - end)
      end = size - 1
    } else if (end === null || end >= size) {
      end = size - 1
    }
    if (start > end || start >= size) {
      res.writeHead(416, { 'content-range': `bytes */${size}` }).end()
      return
    }
    res.writeHead(206, {
      'content-type': type,
      'content-range': `bytes ${start}-${end}/${size}`,
      'accept-ranges': 'bytes',
      'content-length': end - start + 1,
      'cache-control': 'no-cache'
    })
    createReadStream(full, { start, end }).pipe(res)
    return
  }
  res.writeHead(200, {
    'content-type': type,
    'accept-ranges': 'bytes',
    'content-length': size,
    'cache-control': 'no-cache'
  })
  createReadStream(full).pipe(res)
}

// 启动层：必须在 React 之前就存在，所以直接改 index.html 字符串
function bootMarkup() {
  return [
    '<div id="nb-boot" style="position:fixed;inset:0;z-index:2147483600;background:#000;overflow:hidden">',
    '<div id="nb-stage"><div id="nb-frame">',
    `<video id="nb-video" src="${ROUTE_PREFIX}/startup/naiwa-startup.mp4" muted playsinline preload="auto"></video>`,
    '<canvas id="nb-fx"></canvas>',
    '<div id="nb-veil"></div>',
    '<div id="nb-glow"></div>',
    '<div id="nb-scan"></div>',
    '<div class="nb-panel" id="nb-p-tl"></div>',
    '<div class="nb-panel" id="nb-p-tr"></div>',
    '<div class="nb-panel" id="nb-p-bl"></div>',
    '<div class="nb-panel" id="nb-p-br"></div>',
    '<div id="nb-progress"><div id="nb-bar"><i></i></div><div id="nb-status">INITIALIZING</div></div>',
    '</div></div>',
    '<div id="nb-skip"><i></i>跳过片头 · ESC</div>',
    '</div>'
  ].join('')
}

function injectStartup(html) {
  const config = JSON.stringify({ ...STARTUP_BOOT, version: STARTUP_BOOT.version }).replace(/</g, '\\u003c')
  const headBits = [
    '<style>html.nb-lock,html.nb-lock body{background:#000!important;overflow:hidden!important}</style>',
    '<script>document.documentElement.classList.add("nb-lock");',
    'setTimeout(function(){if(!window.__NAIWA_SPLASH_DONE__){document.documentElement.classList.remove("nb-lock");',
    'var b=document.getElementById("nb-boot");if(b&&b.parentNode)b.parentNode.removeChild(b);}},13500)</script>',
    `<link rel="stylesheet" href="${ROUTE_PREFIX}/startup/splash.css">`
  ].join('')
  const bodyBits = [
    `<script>window.__NAIWA_BOOT__=${config}</script>`,
    bootMarkup(),
    `<script defer src="${ROUTE_PREFIX}/startup/splash.js"></script>`
  ].join('')

  let out = html
  if (out.includes('</head>')) out = out.replace('</head>', `${headBits}</head>`)
  else out = headBits + out
  if (/<body[^>]*>/i.test(out)) out = out.replace(/<body[^>]*>/i, (tag) => `${tag}${bodyBits}`)
  else out = bodyBits + out
  return out
}

const STARTUP_LOG = join(homedir(), '.dsh', 'logs', 'naiwa-splash.log')

function logStartup(message) {
  try {
    const stamp = new Date().toISOString()
    mkdirSync(dirname(STARTUP_LOG), { recursive: true })
    appendFileSync(STARTUP_LOG, `${stamp} ${message}\n`)
  } catch {
    /* 日志失败不能影响启动 */
  }
}

function installStartupInjection(ctx) {
  const tap = ctx.webServer?.tapIndex
  logStartup(`apply: tapIndex=${typeof tap}`)
  if (typeof tap !== 'function') {
    logStartup('tapIndex 不可用，改用客户端兜底启动层')
    return () => {}
  }
  try {
    const dispose = tap.call(ctx.webServer, (html) => {
      logStartup(`tapIndex 命中，html ${html.length} 字符`)
      return injectStartup(html)
    })
    logStartup(`tapIndex 注册成功 dispose=${typeof dispose}`)
    return typeof dispose === 'function' ? dispose : () => {}
  } catch (error) {
    logStartup(`注入失败: ${String(error?.stack ?? error?.message ?? error)}`)
    return () => {}
  }
}


function registerRoutes(ctx) {
  safeRegister(ctx, {
    kind: 'exact',
    path: `${ROUTE_PREFIX}/api/backgrounds.json`,
    handler: async (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405).end()
        return
      }
      const items = await listBackgrounds()
      sendJson(res, { ok: true, dir: BG_DIR, count: items.length, items })
    }
  })

  safeRegister(ctx, {
    kind: 'exact',
    path: `${ROUTE_PREFIX}/api/upload`,
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(405).end()
        return
      }
      try {
        const result = await saveUpload(req)
        if (!result.ok) {
          res.writeHead(result.status, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify(result))
          return
        }
        sendJson(res, result)
      } catch (error) {
        res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: String(error?.message ?? error) }))
      }
    }
  })

  safeRegister(ctx, {
    kind: 'exact',
    path: `${ROUTE_PREFIX}/api/delete`,
    handler: async (req, res) => {
      if (req.method !== 'POST' && req.method !== 'DELETE') {
        res.writeHead(405).end()
        return
      }
      try {
        const result = await deleteBackground(req)
        res.writeHead(result.ok ? 200 : result.status, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(result))
      } catch (error) {
        res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: String(error?.message ?? error) }))
      }
    }
  })

  safeRegister(ctx, {
    kind: 'prefix',
    path: `${ROUTE_PREFIX}/bg`,
    handler: async (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405).end()
        return
      }
      const url = new URL(req.url ?? '/', 'http://localhost')
      serveBackground(req, res, url.pathname)
    }
  })
  safeRegister(ctx, {
    kind: 'prefix',
    path: `${ROUTE_PREFIX}/startup`,
    handler: async (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405).end()
        return
      }
      const url = new URL(req.url ?? '/', 'http://localhost')
      serveStartup(req, res, url.pathname)
    }
  })
}

export function apply(ctx) {
  ctx.effect(() => {
    registerRoutes(ctx)
    return () => {}
  }, 'naiwa-studio: wallpaper library routes')

  ctx.effect(() => {
    return installStartupInjection(ctx)
  }, 'naiwa-studio: startup splash injection')
}
