// The ATM account is the player's `users` row, as on hosted servers. Offline
// that row belongs to the local profile and lives in the saves directory's
// sqlite database, so one profile's balance is shared by every world on the
// machine. (Jest runs against an in-memory sqlite db - junon-common/db/config.js.)
const User = require('junon-common/db/user')
const sequelize = require('junon-common/db/sequelize')
const syncStandaloneSchema = require('junon-common/db/standalone_schema')
const Player = require('../../server/entities/player')

let previousEnv

beforeAll(async () => {
  await syncStandaloneSchema(sequelize)
})

beforeEach(async () => {
  previousEnv = global.env
  global.env = 'standalone'
  await User.destroy({ where: {} })
})

afterEach(() => {
  global.env = previousEnv
})

function createPlayer(gold) {
  const player = Object.create(Player.prototype)
  const events = []
  Object.assign(player, {
    uid: 'profileA',
    gold: gold,
    isAuthenticated: true,
    setGold(value) { this.gold = value },
    showError(message) { events.push(['error', message]) },
    onAccountBalanceChanged(balance) { events.push(['balance', balance]) }
  })
  player.events = events
  return player
}

test('depositing in one world and withdrawing in another uses the same account', async () => {
  await User.create({ uid: 'profileA', username: 'Rebel', gold: 0 })

  const inFirstWorld = createPlayer(150)
  await inFirstWorld.depositAccount(100)
  expect(inFirstWorld.gold).toEqual(50)

  const inSecondWorld = createPlayer(0)
  await inSecondWorld.withdrawAccount(60)
  expect(inSecondWorld.gold).toEqual(60)

  expect((await User.findByPk('profileA')).gold).toEqual(40)
})

test('cannot withdraw more than the account holds', async () => {
  await User.create({ uid: 'profileA', username: 'Rebel', gold: 10 })

  const player = createPlayer(0)
  await player.withdrawAccount(11)

  expect(player.gold).toEqual(0)
  expect(player.events).toEqual([['error', 'Not enough Gold']])
})

test('opening the ATM reports the balance', async () => {
  await User.create({ uid: 'profileA', username: 'Rebel', gold: 70 })
  const player = createPlayer(0)
  player.getSocketUtil = () => ({ emit: (socket, event, data) => player.events.push([event, data.balance]) })

  await player.queryBalance()

  expect(player.events).toEqual([['AccountBalance', 70]])
})
