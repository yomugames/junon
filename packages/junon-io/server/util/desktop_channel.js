// The message channel to the desktop shell's main process
// (Server#initDesktopChannel). In the desktop app the server runs in an
// Electron utility process, which provides process.parentPort. Tests can fork
// the server with Node's IPC channel instead (`serialization: 'advanced'`, so
// bytes arrive as Uint8Arrays as they do from Electron) and set
// JUNON_DESKTOP_IPC=1. Returns null when the server isn't run by a shell.
function getDesktopChannel() {
  if (process.parentPort) {
    return {
      onMessage: (handler) => process.parentPort.on('message', ({ data }) => handler(data)),
      postMessage: (message) => process.parentPort.postMessage(message)
    }
  }

  if (process.env.JUNON_DESKTOP_IPC === '1' && process.send) {
    return {
      onMessage: (handler) => process.on('message', handler),
      postMessage: (message) => process.send(message)
    }
  }

  return null
}

module.exports = getDesktopChannel
