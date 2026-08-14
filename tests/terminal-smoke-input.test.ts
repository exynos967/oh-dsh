import assert from 'node:assert/strict'
import { test } from 'node:test'
import { terminalSmokeInput } from '../scripts/terminal-smoke-input.mjs'

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
