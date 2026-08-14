const NODE_PLATFORM_BY_HOST = Object.freeze({
  darwin: 'darwin',
  linux: 'linux',
  win32: 'win',
})

const NODE_ARCH_BY_HOST = Object.freeze({
  arm64: 'arm64',
  x64: 'x64',
})

const HOST_PLATFORM_BY_NODE = Object.freeze({
  darwin: 'darwin',
  linux: 'linux',
  win: 'win32',
})

function normalizeNodePlatform(value) {
  if (value === 'win32') return 'win'
  return value
}

/** Resolve the Node.js distribution triple used by staging and packaging. */
export function resolveNodeTarget(env = process.env, host = process) {
  const platform = normalizeNodePlatform(
    env.DSH_DESKTOP_NODE_PLATFORM
      ?? NODE_PLATFORM_BY_HOST[host.platform]
      ?? host.platform,
  )
  const arch = env.DSH_DESKTOP_NODE_ARCH
    ?? NODE_ARCH_BY_HOST[host.arch]
    ?? host.arch
  return Object.freeze({
    platform,
    arch,
    isWindowsTarget: platform === 'win',
    hostPlatform: HOST_PLATFORM_BY_NODE[platform],
  })
}
