// In a standalone world the owner can switch which saved character they play
// (Game#switchCharacter, the /character command). Only unclaimed characters
// of an imported world - `imported-<n>` ids - can be taken, and the character
// being left becomes unclaimed.
const Game = require('../../server/entities/game')
const Button = require('../../server/entities/button')

const OWNER = 'ownerProfile123'

function createPlayerData(uid, name) {
  return {
    uid: uid,
    name: name,
    data: { uid: uid, name: name },
    getUID() { return this.uid },
    getName() { return this.name }
  }
}

function createGame(playerDatas, teams = {}) {
  const game = Object.create(Game.prototype)
  game.playerDataMap = {}
  game.teams = teams
  playerDatas.forEach((playerData) => { game.playerDataMap[playerData.uid] = playerData })
  game.joins = []
  game.performJoinGame = async (socket, data) => { game.joins.push({ socket, data }) }
  return game
}

// the owner's live player; removing it saves it as player data, as
// Player#remove does for a world owner
function createOwnerPlayer(game, name) {
  return {
    socket: { id: 'socket1' },
    getUid: () => OWNER,
    getName: () => name,
    remove() {
      game.playerDataMap[OWNER] = createPlayerData(OWNER, name)
    }
  }
}

test('switching takes over the chosen character and releases the current one', async () => {
  const kuroro = createPlayerData('imported-1', 'kuroro')
  const bob = createPlayerData('imported-2', 'BobTheHorse')
  const team = { leaderUid: OWNER }
  const game = createGame([kuroro, bob], { 1: team })
  const owner = createOwnerPlayer(game, 'Rebel')

  expect(await game.switchCharacter(owner, 'imported-2')).toBe(true)

  // Bob's character is now the owner's
  expect(game.playerDataMap[OWNER]).toBe(bob)
  expect(bob.uid).toEqual(OWNER)
  expect(bob.data.uid).toEqual(OWNER)

  // the character the owner left is unclaimed, and keeps its team leadership
  const released = game.playerDataMap['imported-3']
  expect(released.name).toEqual('Rebel')
  expect(team.leaderUid).toEqual('imported-3')
  expect(game.playerDataMap['imported-2']).toBeUndefined()

  // and the owner joins again on the same connection
  expect(game.joins).toEqual([{ socket: owner.socket, data: { uid: OWNER } }])
})

test('switching to a new character only releases the current one', async () => {
  const game = createGame([createPlayerData('imported-1', 'kuroro')])
  const owner = createOwnerPlayer(game, 'Rebel')

  expect(await game.switchCharacter(owner, null)).toBe(true)

  expect(game.playerDataMap[OWNER]).toBeUndefined()
  expect(game.playerDataMap['imported-2'].name).toEqual('Rebel')
  expect(game.joins.length).toEqual(1)
})

test('cannot take a character that belongs to another profile or does not exist', async () => {
  const guest = createPlayerData('guestProfile456', 'Guest')
  const game = createGame([guest, createPlayerData('imported-1', 'kuroro')])
  const owner = createOwnerPlayer(game, 'Rebel')

  expect(await game.switchCharacter(owner, 'guestProfile456')).toBe(false)
  expect(await game.switchCharacter(owner, 'imported-9')).toBe(false)

  expect(game.playerDataMap.guestProfile456).toBe(guest)
  expect(game.joins).toEqual([])
})

test('lists only unclaimed characters', () => {
  const game = createGame([
    createPlayerData('imported-1', 'kuroro'),
    createPlayerData('guestProfile456', 'Guest'),
    createPlayerData(OWNER, 'Rebel')
  ])

  expect(game.getUnclaimedCharacters().map((playerData) => playerData.name)).toEqual(['kuroro'])
})

test('a client cannot claim an unclaimed character by presenting its id', () => {
  expect(createGame([]).getLocalProfileUid({ uid: 'imported-1' })).toBeNull()
})

describe('command block buttons', () => {
  // a player whose client hasn't processed JoinGame has no sector to apply a
  // button to; it gets every button once it reports ready instead
  test('changes are only sent to players whose client is ready', () => {
    const sent = []
    const button = Object.create(Button.prototype)
    button.game = {
      forEachPlayer(cb) {
        cb({ isPlayerReady: true, getSocket: () => 'readySocket' })
        cb({ isPlayerReady: false, getSocket: () => 'joiningSocket' })
      }
    }
    button.getSocketUtil = () => ({ emit: (socket) => sent.push(socket) })

    button.onStateChanged()

    expect(sent).toEqual(['readySocket'])
  })
})
