// Sanity check: the client bundle must behave like a classic script that
// self-registers with window.__ModuleLoader__.load().
const fs = require('fs')
const vm = require('vm')

const file = process.argv[2]
const code = fs.readFileSync(file, 'utf8')

let reg = null
const sandbox = {
  window: {
    __ModuleLoader__: {
      load(def) {
        if (reg) throw new Error('registered twice')
        reg = def
      },
    },
  },
  console,
}
sandbox.window.window = sandbox.window
sandbox.globalThis = sandbox
sandbox.document = undefined

vm.createContext(sandbox)
vm.runInContext(code, sandbox, { filename: file })

if (!reg) throw new Error('window.__ModuleLoader__.load() was never called')
if (reg.id !== 'dsh-naiwa-studio') throw new Error('unexpected id: ' + reg.id)
if (typeof reg.factory !== 'function') throw new Error('factory is not a function')

const exportsObj = reg.factory((s) => {
  throw new Error('unexpected require: ' + s)
})
if (typeof exportsObj !== 'object' || exportsObj === null) throw new Error('factory did not return exports')
if (typeof exportsObj.apply !== 'function') throw new Error('missing apply()')
if (!Array.isArray(exportsObj.inject)) throw new Error('inject is not an array')

// apply() must be a no-op when there is no DOM (SSR / host-side import).
const r = exportsObj.apply({})
if (r !== undefined) throw new Error('apply() should bail out without a document')

// The assets must be inlined, not fetched.
if (!/data:image\/png;base64,/.test(code)) throw new Error('pet sprite not inlined')
if (/\bimport\s|\bexport\s/.test(code)) throw new Error('ESM syntax still present')

console.log('ok: id=%s exports=%s inject=%j size=%dKB', reg.id, Object.keys(exportsObj).join(','), exportsObj.inject, Math.round(code.length / 1024))
