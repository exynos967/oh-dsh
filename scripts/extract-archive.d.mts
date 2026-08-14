export function resolveTarCommand(): string
export function extractArchive(archive: string, destination: string): void
export function createArchive(
  archive: string,
  entries: readonly string[],
  options: { cwd: string },
): void
