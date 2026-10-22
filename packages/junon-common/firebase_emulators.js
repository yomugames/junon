const net = require('net')
const Config = require('./config')

// Fail before serving requests rather than letting Firebase retry forever.
module.exports = async function checkFirebaseEmulators(environment) {
  if (environment !== 'development') return
  await Promise.all(Object.values(Config.development.firebaseEmulators).map(address => {
    const [host, port] = address.split(':')
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host, port: Number(port) })
      const fail = () => {
        socket.destroy()
        reject(new Error('Firebase emulator unavailable at ' + address + '. Run npm run firebase:emulators first.'))
      }
      socket.setTimeout(2000, fail)
      socket.once('error', fail)
      socket.once('connect', () => {
        socket.destroy()
        resolve()
      })
    })
  }))
}
