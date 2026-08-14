import { existsSync, lstatSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** `.pnpm/<store-entry>/node_modules/` → empty, leaving the hoisted `name/...` hop. */
const STORE_HOP = /\.pnpm[/\\][^"' \r\n]+[/\\]node_modules[/\\]/g
/** Leftover store-root `node_modules/.pnpm/node_modules` after the hops are gone. */
const STORE_ROOT = /node_modules[/\\]\.pnpm[/\\]node_modules/g

/** Rewrite cmd-shim / NODE_PATH hops that still go through the pnpm virtual store. */
export function rewritePnpmStoreHops(text) {
  return text.replace(STORE_HOP, '').replace(STORE_ROOT, 'node_modules')
}

/** Point `node_modules/.bin` shims at hoisted packages before the store is deleted. */
export function rewritePnpmBinShims(rootPath) {
  const binDir = join(rootPath, 'node_modules', '.bin')
  if (!existsSync(binDir)) return 0
  let rewritten = 0
  for (const name of readdirSync(binDir)) {
    const file = join(binDir, name)
    if (!lstatSync(file).isFile()) continue
    const original = readFileSync(file, 'utf8')
    const next = rewritePnpmStoreHops(original)
    if (next === original) continue
    writeFileSync(file, next)
    rewritten += 1
  }
  return rewritten
}

/** Drop `node_modules/.pnpm` after Windows flatten has hoisted real copies. */
export function prunePnpmStore(rootPath) {
  const store = join(rootPath, 'node_modules', '.pnpm')
  if (!existsSync(store)) return false
  rmSync(store, { recursive: true, force: true, maxRetries: 15, retryDelay: 200 })
  return true
}
