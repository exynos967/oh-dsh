import { spawnSync } from 'node:child_process'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const UPSTREAM_REPOSITORY = 'https://github.com/deepseek-ai/deepseek-harness.git'
export const UPSTREAM_BRANCH = 'master'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const specPath = join(root, 'dsh-source.json')

function capture(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    throw new Error(result.stderr || `${command} ${args.join(' ')} failed`)
  }
  return (result.stdout ?? '').trim()
}

export function parseLsRemote(output) {
  const line = output.trim().split('\n')[0] ?? ''
  const sha = line.split(/\s+/)[0] ?? ''
  if (!/^[0-9a-f]{40}$/.test(sha)) {
    throw new Error(`git ls-remote returned no usable commit: ${output}`)
  }
  return sha
}

export function shieldBadgeVersion(version) {
  return version.replaceAll('-', '--')
}

export function replaceDshBadge(markdown, version) {
  return markdown.replace(
    /<img alt="DSH [^"]+" src="https:\/\/img\.shields\.io\/badge\/DSH-[^"]+">/g,
    `<img alt="DSH ${version}" src="https://img.shields.io/badge/DSH-${shieldBadgeVersion(version)}-2f81f7">`,
  )
}

export function readSourceSpec(path = specPath) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function resolveUpstreamRevision(input, repository = UPSTREAM_REPOSITORY) {
  const requested = input === undefined || input === '' ? UPSTREAM_BRANCH : input
  if (requested === UPSTREAM_BRANCH) {
    const output = capture('git', ['ls-remote', repository, `refs/heads/${UPSTREAM_BRANCH}`])
    if (output === '') {
      throw new Error(`git ls-remote ${repository} refs/heads/${UPSTREAM_BRANCH} returned empty output`)
    }
    return parseLsRemote(output)
  }
  if (!/^[0-9a-f]{40}$/.test(requested)) {
    throw new Error(`DSH revision must be "${UPSTREAM_BRANCH}" or a full 40-character commit: ${requested}`)
  }
  const advertised = capture('git', ['ls-remote', repository, requested])
  if (advertised !== '') {
    const actual = parseLsRemote(advertised)
    if (actual !== requested) {
      throw new Error(`git ls-remote ${repository} ${requested} resolved to ${actual}`)
    }
  }
  return requested
}

export function fetchUpstreamVersion(revision, repository = UPSTREAM_REPOSITORY) {
  const match = repository.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/)
  if (match === null) {
    throw new Error(`cannot derive raw GitHub URL from ${repository}`)
  }
  const url = `https://raw.githubusercontent.com/${match[1]}/${revision}/package.json`
  const body = capture('curl', ['--fail', '--location', '--silent', '--show-error', url])
  const manifest = JSON.parse(body)
  if (typeof manifest.version !== 'string' || manifest.version === '') {
    throw new Error(`upstream package.json at ${revision} has no version`)
  }
  return manifest.version
}

export function sourceSpecFor(revision, version, current = readSourceSpec()) {
  return {
    repository: current.repository,
    ref: revision,
    revision,
    version,
  }
}

export function specsEqual(left, right) {
  return left.repository === right.repository
    && left.ref === right.ref
    && left.revision === right.revision
    && left.version === right.version
}

function writeGithubOutput(values) {
  const output = process.env.GITHUB_OUTPUT
  if (output === undefined || output === '') return
  appendFileSync(
    output,
    Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(''),
  )
}

function writeReadmeBadges(version) {
  for (const name of ['README.md', 'README.en.md']) {
    const path = join(root, name)
    const current = readFileSync(path, 'utf8')
    const next = replaceDshBadge(current, version)
    if (next !== current) writeFileSync(path, next)
  }
}

export function applyDshSource({ revision, dryRun = false } = {}) {
  const current = readSourceSpec()
  const nextRevision = resolveUpstreamRevision(revision, current.repository)
  const version = fetchUpstreamVersion(nextRevision, current.repository)
  const next = sourceSpecFor(nextRevision, version, current)
  const changed = !specsEqual(current, next)
  if (!dryRun) {
    writeFileSync(specPath, `${JSON.stringify(next, undefined, 2)}\n`)
    writeReadmeBadges(version)
  }
  writeGithubOutput({
    changed: changed ? 'true' : 'false',
    sha: nextRevision,
    version,
  })
  return { changed, spec: next }
}

function invokedDirectly() {
  const entry = process.argv[1]
  if (entry === undefined) return false
  return fileURLToPath(import.meta.url) === resolve(entry)
}

if (invokedDirectly()) {
  const dryRun = process.argv.includes('--dry-run')
  const revision = process.argv.slice(2).find(arg => arg !== '--dry-run')
  const result = applyDshSource({ revision, dryRun })
  const label = result.changed ? 'would update' : 'unchanged'
  console.log(
    `${dryRun ? label : result.changed ? 'updated' : 'unchanged'} DSH ${result.spec.version} (${result.spec.revision})`,
  )
}
