import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  prunePnpmStore,
  rewritePnpmBinShims,
  rewritePnpmStoreHops,
} from '../scripts/prune-pnpm-store.mjs'

test('rewrites posix and Windows hops out of the pnpm store', () => {
  assert.equal(
    rewritePnpmStoreHops('$basedir/../.pnpm/js-yaml@4.2.0/node_modules/js-yaml/bin/js-yaml.js'),
    '$basedir/../js-yaml/bin/js-yaml.js',
  )
  assert.equal(
    rewritePnpmStoreHops('"%dp0\\..\\.pnpm\\js-yaml@4.2.0\\node_modules\\js-yaml\\bin\\js-yaml.js"'),
    '"%dp0\\..\\js-yaml\\bin\\js-yaml.js"',
  )
  assert.equal(
    rewritePnpmStoreHops(
      '../.pnpm/@deepseek-ai+cordis@file+ve_1754df0b59f9be881ef6362ca7de52a1/node_modules/@deepseek-ai/cordis/bin.js',
    ),
    '../@deepseek-ai/cordis/bin.js',
  )
  assert.equal(
    rewritePnpmStoreHops('D:\\app\\node_modules\\.pnpm\\node_modules'),
    'D:\\app\\node_modules',
  )
})

test('rewrites .bin shims and deletes the leftover store', () => {
  const root = mkdtempSync(join(tmpdir(), 'oh-dsh-prune-'))
  try {
    const bin = join(root, 'node_modules', '.bin')
    const store = join(root, 'node_modules', '.pnpm', 'js-yaml@4.2.0', 'node_modules', 'js-yaml')
    mkdirSync(bin, { recursive: true })
    mkdirSync(store, { recursive: true })
    writeFileSync(join(store, 'keep.txt'), 'store\n')
    writeFileSync(
      join(bin, 'js-yaml'),
      'exec node "$basedir/../.pnpm/js-yaml@4.2.0/node_modules/js-yaml/bin/js-yaml.js"\n',
    )
    assert.equal(rewritePnpmBinShims(root), 1)
    assert.equal(
      readFileSync(join(bin, 'js-yaml'), 'utf8'),
      'exec node "$basedir/../js-yaml/bin/js-yaml.js"\n',
    )
    assert.equal(prunePnpmStore(root), true)
    assert.equal(existsSync(join(root, 'node_modules', '.pnpm')), false)
    assert.equal(prunePnpmStore(root), false)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
