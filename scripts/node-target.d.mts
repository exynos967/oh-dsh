export interface NodeTarget {
  readonly platform: string
  readonly arch: string
  readonly isWindowsTarget: boolean
  readonly hostPlatform: string | undefined
}

export function resolveNodeTarget(
  env?: NodeJS.ProcessEnv,
  host?: Pick<NodeJS.Process, 'platform' | 'arch'>,
): NodeTarget
