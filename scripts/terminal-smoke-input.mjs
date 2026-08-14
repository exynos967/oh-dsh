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

/**
 * Windows ConPTY drops keystrokes sent before powershell.exe finishes its
 * banner. Wait for the banner tail or a PS prompt; POSIX shells accept
 * input as soon as the socket is open.
 */
export function terminalSmokeReady(output, platform = process.platform) {
  if (platform !== 'win32') return true
  return /aka\.ms\/PSWindows|PS [A-Z]:/i.test(output)
}

/** How long the PTY smoke should wait for the marker. */
export function terminalSmokeTimeoutMs(platform = process.platform) {
  return platform === 'win32' ? 25_000 : 10_000
}

/**
 * Drive one Better Sidebar terminal socket: resize, wait until the shell
 * can accept input, send the marker command, then close on success.
 */
export function attachTerminalSmoke(socket, {
  marker,
  platform = process.platform,
  delay = (ms, fn) => setTimeout(fn, ms),
} = {}) {
  const input = terminalSmokeInput(marker, platform)
  let output = ''
  let sent = false
  let settled = false
  let sendTimer

  const sendInput = () => {
    if (sent || settled) return
    sent = true
    socket.send(input)
  }

  const finish = (error) => {
    if (settled) return
    settled = true
    if (sendTimer !== undefined) clearTimeout(sendTimer)
    clearTimeout(timeout)
    socket.close()
    if (error === undefined) resolvePromise()
    else rejectPromise(error)
  }

  let resolvePromise
  let rejectPromise
  const done = new Promise((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  const timeout = setTimeout(() => {
    finish(new Error(`terminal smoke timed out; output=${JSON.stringify(output)}`))
  }, terminalSmokeTimeoutMs(platform))

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ type: 'resize', cols: 80, rows: 24 }))
    if (terminalSmokeReady('', platform)) sendInput()
  })
  socket.addEventListener('message', event => {
    output += String(event.data)
    if (!sent && terminalSmokeReady(output, platform)) {
      sendTimer = delay(250, sendInput)
    }
    if (output.includes(marker)) {
      socket.send(JSON.stringify({ type: 'close' }))
      finish()
    }
  })
  socket.addEventListener('error', () => {
    finish(new Error('terminal websocket connection failed'))
  })
  socket.addEventListener('close', () => {
    if (!settled) finish(new Error(`terminal websocket closed early; output=${JSON.stringify(output)}`))
  })

  return done
}
