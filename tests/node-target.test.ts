import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveNodeTarget } from '../scripts/node-target.mjs'

test('maps Windows hosts to the Node win triple', () => {
  const target = resolveNodeTarget({}, { platform: 'win32', arch: 'x64' })
  assert.equal(target.platform, 'win')
  assert.equal(target.arch, 'x64')
  assert.equal(target.isWindowsTarget, true)
  assert.equal(target.hostPlatform, 'win32')
})

test('keeps POSIX Node triples unchanged', () => {
  const mac = resolveNodeTarget({}, { platform: 'darwin', arch: 'arm64' })
  assert.equal(mac.platform, 'darwin')
  assert.equal(mac.arch, 'arm64')
  assert.equal(mac.isWindowsTarget, false)
  assert.equal(mac.hostPlatform, 'darwin')

  const linux = resolveNodeTarget({}, { platform: 'linux', arch: 'x64' })
  assert.equal(linux.platform, 'linux')
  assert.equal(linux.hostPlatform, 'linux')
})

test('normalizes a win32 platform override to win', () => {
  const target = resolveNodeTarget({
    DSH_DESKTOP_NODE_PLATFORM: 'win32',
    DSH_DESKTOP_NODE_ARCH: 'x64',
  }, { platform: 'linux', arch: 'arm64' })
  assert.equal(target.platform, 'win')
  assert.equal(target.arch, 'x64')
  assert.equal(target.isWindowsTarget, true)
  assert.equal(target.hostPlatform, 'win32')
})
