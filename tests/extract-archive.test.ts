import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { extractArchive } from '../scripts/extract-archive.mjs'

test('extractArchive unpacks an archive produced by the system tar', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oh-dsh-tar-'))
  try {
    writeFileSync(join(dir, 'hello.txt'), 'ok\n')
    const archive = process.platform === 'win32' ? join(dir, 'hello.zip') : join(dir, 'hello.tgz')
    const packed = process.platform === 'win32'
      ? spawnSync(
        join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe'),
        ['-a', '-cf', 'hello.zip', 'hello.txt'],
        { cwd: dir },
      )
      : spawnSync('tar', ['-czf', 'hello.tgz', 'hello.txt'], { cwd: dir })
    assert.equal(packed.status, 0, packed.stderr?.toString())
    const out = join(dir, 'out')
    mkdirSync(out)
    extractArchive(archive, out)
    assert.equal(existsSync(join(out, 'hello.txt')), true)
    assert.equal(readFileSync(join(out, 'hello.txt'), 'utf8'), 'ok\n')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
