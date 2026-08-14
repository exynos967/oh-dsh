export function terminalSmokeInput(
  marker: string,
  platform?: NodeJS.Platform,
): string

export function terminalSmokeReady(
  output: string,
  platform?: NodeJS.Platform,
): boolean

export function terminalSmokeTimeoutMs(platform?: NodeJS.Platform): number

export interface TerminalSmokeSocket {
  addEventListener(type: string, listener: (event: { data?: unknown }) => void): void
  close(): void
  send(data: string): void
}

export function attachTerminalSmoke(
  socket: TerminalSmokeSocket,
  options: {
    marker: string
    platform?: NodeJS.Platform
    delay?: (ms: number, fn: () => void) => unknown
  },
): Promise<void>
