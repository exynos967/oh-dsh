import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  parseLsRemote,
  replaceDshBadge,
  shieldBadgeVersion,
  sourceSpecFor,
  specsEqual,
} from '../scripts/set-dsh-source.mjs'

test('parseLsRemote reads the first advertised commit', () => {
  assert.equal(
    parseLsRemote('47f943859bef60e4160492346772ded9b24f765a\trefs/heads/master\n'),
    '47f943859bef60e4160492346772ded9b24f765a',
  )
})

test('parseLsRemote rejects empty ls-remote output', () => {
  assert.throws(() => parseLsRemote(''), /no usable commit/)
})

test('shields.io badge versions escape hyphens', () => {
  assert.equal(shieldBadgeVersion('0.1.0-rc.5'), '0.1.0--rc.5')
})

test('replaceDshBadge rewrites both the alt text and the badge URL', () => {
  const markdown = '<img alt="DSH 0.1.0-rc.5" src="https://img.shields.io/badge/DSH-0.1.0--rc.5-2f81f7">'
  assert.equal(
    replaceDshBadge(markdown, '0.2.0'),
    '<img alt="DSH 0.2.0" src="https://img.shields.io/badge/DSH-0.2.0-2f81f7">',
  )
})

test('source specs compare repository, ref, revision, and version', () => {
  const current = {
    repository: 'https://github.com/deepseek-ai/deepseek-harness.git',
    ref: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    revision: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    version: '0.1.0-rc.5',
  }
  const next = sourceSpecFor('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', '0.1.0-rc.6', current)
  assert.equal(next.ref, next.revision)
  assert.equal(specsEqual(current, next), false)
  assert.equal(specsEqual(next, { ...next }), true)
})
