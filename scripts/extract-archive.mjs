import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'

export function resolveTarCommand() {
  if (process.platform === 'win32') {
    const systemTar = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe')
    if (existsSync(systemTar)) return systemTar
  }
  return 'tar'
}

/**
 * Unpack a .tar.gz / .tgz / .zip / .tar with the system tar, using paths
 * relative to the archive directory so GNU tar on Windows does not treat a
 * drive letter (`D:`) as a remote host. Prefer Windows bsdtar for zip.
 */
export function extractArchive(archive, destination) {
  const archiveAbs = resolve(archive)
  const destAbs = resolve(destination)
  mkdirSync(destAbs, { recursive: true })
  const cwd = dirname(archiveAbs)
  const destRel = relative(cwd, destAbs)
  if (destRel.includes(':')) {
    throw new Error(`cannot extract ${archiveAbs} to ${destAbs}: cross-drive tar paths are not portable on Windows`)
  }
  const gzip = archiveAbs.endsWith('.tar.gz') || archiveAbs.endsWith('.tgz')
  const args = gzip
    ? ['-xzf', basename(archiveAbs), '-C', destRel === '' ? '.' : destRel]
    : ['-xf', basename(archiveAbs), '-C', destRel === '' ? '.' : destRel]
  const tar = resolveTarCommand()
  const result = spawnSync(tar, args, { cwd, stdio: 'inherit' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    throw new Error(`tar ${args.join(' ')} failed with status ${String(result.status)}`)
  }
}

/** Create a .tar.gz or .zip next to `cwd` using archive-relative paths. */
export function createArchive(archive, entries, { cwd }) {
  const archiveAbs = resolve(archive)
  const cwdAbs = resolve(cwd)
  const archiveRel = relative(cwdAbs, archiveAbs)
  if (archiveRel.includes(':') || archiveRel.startsWith('..')) {
    throw new Error(`cannot write archive ${archiveAbs} from ${cwdAbs}: path is not local to the working directory`)
  }
  const zip = archiveAbs.endsWith('.zip')
  const args = zip
    ? ['-a', '-cf', archiveRel, ...entries]
    : ['-czf', archiveRel, ...entries]
  const result = spawnSync(resolveTarCommand(), args, { cwd: cwdAbs, stdio: 'inherit' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    throw new Error(`tar ${args.join(' ')} failed with status ${String(result.status)}`)
  }
}
