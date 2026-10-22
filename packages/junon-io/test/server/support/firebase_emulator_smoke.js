// This process uses disposable SQLite for SQL assertions, then switches runtime
// Firebase/authentication behavior to development. No developer data is touched.
const assert = require('assert')
process.env.NODE_ENV = 'test'
const Matchmaker = require('../../../../junon-matchmaker/src/index')
const Server = require('../../../server/server')
const sequelize = require('junon-common/db/sequelize')
const User = require('junon-common/db/user')
const Sector = require('junon-common/db/sector')
const Helper = require('../../../../junon-matchmaker/src/firebase_admin_helper')
const GameHelper = require('../../../server/util/firebase_admin_helper')

global.env = 'development'
global.isOffline = false

async function run() {
  const { getAuth } = require('firebase-admin/auth')
  const { getDatabase } = require('firebase-admin/database')
  const { getApp } = require('firebase-admin/app')
  Helper.init()
  GameHelper.init() // Combined entry point must share one Admin app.
  assert.equal(getApp().options.projectId, 'demo-junon-local')
  for (const model of Object.values(sequelize.models)) await model.sync()

  const uid = 'local-smoke-' + Date.now()
  await getAuth().createUser({ uid, email: uid + '@example.test', password: 'local-test-password' })
  // Exercise the installed legacy client SDK against the same emulator namespace.
  const firebase = require('@firebase/app').default
  require('@firebase/auth')
  require('@firebase/database')
  const config = require('junon-common/config').development
  firebase.initializeApp(config.firebase)
  firebase.auth().useEmulator('http://' + config.firebaseEmulators.auth)
  const signedIn = await firebase.auth().signInWithEmailAndPassword(uid + '@example.test', 'local-test-password')
  const token = await signedIn.user.getIdToken()
  await firebase.database().ref('users/' + uid).set({ username: 'LocalTest' })
  assert.equal((await getDatabase().ref('users/' + uid).once('value')).val().username, 'LocalTest')
  const matchmaker = new Matchmaker()
  assert.equal(await matchmaker.getUidFromRequest(token, 'forged-uid'), uid)
  assert.equal(await Server.prototype.getUidFromRequest(token, 'forged-uid'), uid)
  assert.equal(await matchmaker.getUidFromRequest('invalid', uid), null)
  assert.equal(await Server.prototype.getUidFromRequest(null, uid), null)

  // Exercise the actual account HTTP handler against disposable SQL.
  matchmaker.APP_SERVER_PORT = await require('get-port')()
  matchmaker.initServerForPlayers()
  const createUser = await fetch('http://127.0.0.1:' + matchmaker.APP_SERVER_PORT + '/create_user', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token, uid: 'forged-uid', username: 'LocalTest' })
  })
  assert.deepEqual(await createUser.json(), { success: true })
  assert(await User.findByPk(uid))
  assert.equal(await User.findByPk('forged-uid'), null)

  // Keep real auth and SQL, substitute only game allocation/socket transport.
  const emitted = []
  const gameServer = { host: 'local-test', reserveSpot() {} }
  matchmaker.getRegion = () => ({ findBusiestAvailableNode: () => ({ getAvailableServer: () => gameServer }) })
  matchmaker.getEnvironment = () => ({ getActivePlayerCreatedGame: () => null })
  matchmaker.checkIsBanned = async () => false
  matchmaker.socketUtil.emit = (socket, event, data) => emitted.push({ event, data })
  matchmaker.gameServerSockets[gameServer.host] = {}
  for (const data of [
    { name: 'Owned test colony', idToken: token, uid: 'forged-uid' },
    { name: 'Guest test colony' }
  ]) {
    await matchmaker.onNewColony(data, { remoteAddress: '127.0.0.1', id: 'local-test' })
    const event = emitted.pop()
    assert.equal(event.event, 'CreateGame', JSON.stringify(event))
    const sector = await Sector.findByPk(event.data.sectorId)
    assert(sector, 'normal colonies must have SQL records')
    assert.equal(sector.name, data.name)
    assert.equal(sector.creatorUid, data.idToken ? uid : null)
  }

  GameHelper.setRegion('localhost')
  await GameHelper.sendServerPlayerCount('local-smoke', 2)
  const ref = getDatabase().ref('/servers/localhost/local-smoke')
  assert.equal((await ref.child('data/playerCount').once('value')).val(), 2)
  await ref.remove()
  await getDatabase().ref('users/' + uid).remove()
  await firebase.auth().signOut()
  await firebase.app().delete()
  await getAuth().deleteUser(uid)
  await sequelize.close()
  console.log('Emulator token verification, SQL accounts/owned and guest sectors, and RTDB writes passed')
}

run().then(() => process.exit(0), error => { console.error(error); process.exit(1) })
