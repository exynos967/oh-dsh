import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import {
  desktopLaunchSpec,
  main,
} from '../src/cli.ts'

function output(): { stream: NodeJS.WriteStream; text: () => string } {
  let value = ''
  return {
    stream: {
      isTTY: false,
      write: (chunk: string) => {
        value += chunk
        return true
      },
    } as unknown as NodeJS.WriteStream,
    text: () => value,
  }
}

test('ohdsh dispatches desktop and web through one surface command', async () => {
  const stdout = output()
  const stderr = output()
  const calls: Array<{ args: readonly string[]; surface: string }> = []

  assert.equal(await main(
    ['desktop', '--inspect'],
    {},
    stdout.stream,
    stderr.stream,
    async args => {
      calls.push({ args, surface: 'desktop' })
      return 0
    },
    async args => {
      calls.push({ args, surface: 'web' })
      return 0
    },
  ), 0)
  assert.equal(await main(
    ['web', '--port', '0'],
    {},
    stdout.stream,
    stderr.stream,
    async () => 0,
    async args => {
      calls.push({ args, surface: 'web' })
      return 0
    },
  ), 0)
  assert.deepEqual(calls, [
    { args: ['--inspect'], surface: 'desktop' },
    { args: ['--port', '0'], surface: 'web' },
  ])
})

test('ohdsh reports the planned TUI without pretending to start it', async () => {
  const stdout = output()
  const stderr = output()
  assert.equal(await main(
    ['tui'],
    {},
    stdout.stream,
    stderr.stream,
  ), 2)
  assert.match(stderr.text(), /planned but is not available yet/)
})

test('desktop launch keeps source and installed macOS paths distinct', () => {
  const app = '/Applications/Oh-DSH Desktop.app'
  assert.deepEqual(desktopLaunchSpec([], {
    OH_DSH_DESKTOP_APP: app,
  }, 'darwin'), {
    args: [resolve(app)],
    command: '/usr/bin/open',
  })
  assert.deepEqual(desktopLaunchSpec([], {}, 'darwin'), {
    args: ['-a', 'Oh-DSH Desktop'],
    command: '/usr/bin/open',
  })
})

test('desktop launch uses the explicit Windows app path', () => {
  const app = join(tmpdir(), 'Oh-DSH Desktop.exe')
  assert.deepEqual(desktopLaunchSpec([], {
    OH_DSH_DESKTOP_APP: app,
  }, 'win32'), {
    args: [],
    command: resolve(app),
  })
  assert.deepEqual(desktopLaunchSpec([], {}, 'win32'), {
    args: ['/d', '/s', '/c', 'start', '""', 'Oh-DSH Desktop.exe'],
    command: 'cmd.exe',
  })
})
