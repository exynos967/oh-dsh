import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  attachTerminalSmoke,
  terminalSmokeInput,
  terminalSmokeReady,
  terminalSmokeTimeoutMs,
  type TerminalSmokeSocket,
} from '../scripts/terminal-smoke-input.mjs'

test('POSIX smoke input splits the marker so an echo cannot match', () => {
  const input = terminalSmokeInput('OH_DSH_WEB_TERMINAL_SMOKE', 'linux')
  assert.match(input, /printf '%s%s\\n' OH_DSH_WEB_TERMINAL_ SMOKE; exit/)
  assert.equal(input.includes('OH_DSH_WEB_TERMINAL_SMOKE'), false)
})

test('Windows smoke input uses PowerShell concatenation', () => {
  const input = terminalSmokeInput('OH_DSH_WEB_TERMINAL_SMOKE', 'win32')
  assert.match(input, /Write-Output \('OH_DSH_WEB_TERMINAL_' \+ 'SMOKE'\); exit/)
  assert.equal(input.includes('OH_DSH_WEB_TERMINAL_SMOKE'), false)
})

test('Windows waits for the PowerShell banner before accepting input', () => {
  assert.equal(terminalSmokeReady('', 'win32'), false)
  assert.equal(terminalSmokeReady('Windows PowerShell\r\n', 'win32'), false)
  assert.equal(terminalSmokeReady('Install the latest PowerShell ... https://aka.ms/PSWindows', 'win32'), true)
  assert.equal(terminalSmokeReady('PS D:\\a\\oh-dsh\\oh-dsh>', 'win32'), true)
  assert.equal(terminalSmokeReady('', 'linux'), true)
  assert.equal(terminalSmokeTimeoutMs('win32') > terminalSmokeTimeoutMs('linux'), true)
})

test('Windows terminal smoke does not write the command until the banner finishes', async () => {
  const sent: string[] = []
  const socket = new EventTarget() as EventTarget & {
    close(): void
    send(data: string): void
  }
  socket.send = (data: string) => { sent.push(data) }
  socket.close = () => { socket.dispatchEvent(new Event('close')) }
  const pending = attachTerminalSmoke(socket as TerminalSmokeSocket, {
    marker: 'OH_DSH_WEB_TERMINAL_SMOKE',
    platform: 'win32',
    delay: (_ms, fn) => fn(),
  })
  socket.dispatchEvent(new Event('open'))
  assert.deepEqual(sent, [JSON.stringify({ type: 'resize', cols: 80, rows: 24 })])

  socket.dispatchEvent(new MessageEvent('message', {
    data: 'Windows PowerShell\r\nCopyright (C) Microsoft Corporation. All rights reserved.\r\n',
  }))
  assert.equal(sent.length, 1)

  socket.dispatchEvent(new MessageEvent('message', {
    data: 'Install the latest PowerShell for new features and improvements! https://aka.ms/PSWindows',
  }))
  assert.match(String(sent.at(-1)), /Write-Output \('OH_DSH_WEB_TERMINAL_' \+ 'SMOKE'\); exit/)

  socket.dispatchEvent(new MessageEvent('message', { data: 'OH_DSH_WEB_TERMINAL_SMOKE' }))
  await pending
  assert.equal(sent.at(-1), JSON.stringify({ type: 'close' }))
})
