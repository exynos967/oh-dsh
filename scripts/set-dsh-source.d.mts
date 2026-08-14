export const UPSTREAM_REPOSITORY: string
export const UPSTREAM_BRANCH: string

export function parseLsRemote(output: string): string
export function shieldBadgeVersion(version: string): string
export function replaceDshBadge(markdown: string, version: string): string
export function readSourceSpec(path?: string): {
  repository: string
  ref: string
  revision: string
  version: string
}
export function resolveUpstreamRevision(input?: string, repository?: string): string
export function fetchUpstreamVersion(revision: string, repository?: string): string
export function sourceSpecFor(
  revision: string,
  version: string,
  current?: ReturnType<typeof readSourceSpec>,
): ReturnType<typeof readSourceSpec>
export function specsEqual(
  left: ReturnType<typeof readSourceSpec>,
  right: ReturnType<typeof readSourceSpec>,
): boolean
export function applyDshSource(options?: {
  revision?: string
  dryRun?: boolean
}): {
  changed: boolean
  spec: ReturnType<typeof readSourceSpec>
}
