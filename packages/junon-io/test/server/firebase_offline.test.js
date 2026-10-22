const { execFileSync } = require('child_process')
const path = require('path')
const repositoryRoot = path.resolve(__dirname, '../../../..')

const services = [
  ['packages/junon-io/server/server', 'packages/junon-io/server/util/firebase_admin_helper'],
  ['packages/junon-matchmaker/src/index', 'packages/junon-matchmaker/src/firebase_admin_helper']
]

test.each(services)('%s keeps development online without ADC', (service, helper) => {
  execFileSync(process.execPath, ['-e', `
    const assert = require('assert')
    process.env.NODE_ENV = 'development'
    require(${JSON.stringify(path.join(repositoryRoot, service))})
    assert(!global.isOffline)
    require(${JSON.stringify(path.join(repositoryRoot, helper))}).init()
    const app = require('firebase-admin/app').getApp()
    assert.equal(app.options.projectId, 'demo-junon-local')
    assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099')
    assert.equal(process.env.FIREBASE_DATABASE_EMULATOR_HOST, '127.0.0.1:9000')
    assert(!app.options.databaseURL.includes('firebaseio.com'))
    process.exit(0)
  `], { cwd: repositoryRoot, env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: '/missing/junon-credentials.json' } })
})

test.each(services)('%s retains isolated test startup', (service, helper) => {
  execFileSync(process.execPath, ['-e', `
    const assert = require('assert')
    process.env.NODE_ENV = 'test'
    require(${JSON.stringify(path.join(repositoryRoot, service))})
    assert(global.isOffline)
    require(${JSON.stringify(path.join(repositoryRoot, helper))}).init()
    assert.equal(require('firebase-admin/app').getApps().length, 0)
  `], { cwd: repositoryRoot })
})

test('remote Firebase still uses ADC and its configured database', () => {
  const options = require('junon-common/firebase_options')
  const credential = {}
  const adc = jest.fn(() => credential)
  expect(options('production', adc)).toEqual({
    credential, databaseURL: require('junon-common/config').production.firebase.databaseURL
  })
  expect(adc).toHaveBeenCalledTimes(1)
})

test('browser, Admin and CLI share the local project and endpoints', () => {
  const config = require('junon-common/config').development
  const cli = require('../../../../firebase.json').emulators
  expect(config.firebase.projectId).toBe('demo-junon-local')
  expect(config.firebaseEmulators.auth).toBe(cli.auth.host + ':' + cli.auth.port)
  expect(config.firebaseEmulators.database).toBe(cli.database.host + ':' + cli.database.port)
  const database = new URL(config.firebase.databaseURL)
  expect(database.host).toBe(config.firebaseEmulators.database)
  expect(database.searchParams.get('ns')).toBe(config.firebase.projectId + '-default-rtdb')
})

test('unavailable emulators produce actionable startup failure', async () => {
  const net = require('net')
  const { EventEmitter } = require('events')
  const connect = jest.spyOn(net, 'createConnection').mockImplementation(() => {
    const socket = new EventEmitter()
    socket.destroy = jest.fn()
    socket.setTimeout = jest.fn()
    process.nextTick(() => socket.emit('error', new Error('ECONNREFUSED')))
    return socket
  })
  try {
    await expect(require('junon-common/firebase_emulators')('development'))
      .rejects.toThrow('Run npm run firebase:emulators first')
    connect.mockClear()
    await require('junon-common/firebase_emulators')('production')
    expect(connect).not.toHaveBeenCalled()
  } finally {
    connect.mockRestore()
  }
})
