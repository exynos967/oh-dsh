/** Build a PTY input that prints `marker` only after the shell executes it. */
export function terminalSmokeInput(marker, platform = process.platform) {
  const split = marker.lastIndexOf('_')
  if (split <= 0 || split === marker.length - 1) {
    throw new Error(`terminal smoke marker must contain a split _: ${marker}`)
  }
  const head = marker.slice(0, split + 1)
  const tail = marker.slice(split + 1)
  if (platform === 'win32') {
    return `Write-Output ('${head}' + '${tail}'); exit\r`
  }
  return `printf '%s%s\\n' ${head} ${tail}; exit\r`
}
