// Standalone (offline) mode has no accounts. A client identifies itself with
// an opaque id kept in its local profile, which keys its saved character, and
// the world belongs to the local player rather than to a hosted account.
const Game = require('../../server/entities/game')

function createGame(overrides = {}) {
  const game = Object.create(Game.prototype)
  Object.assign(game, { players: {}, gameMode: 'survival' }, overrides)
  return game
}

let previousEnv

beforeEach(() => {
  previousEnv = global.env
})

afterEach(() => {
  global.env = previousEnv
})

describe('getLocalProfileUid', () => {
  test('accepts the id a client profile generates', () => {
    // client/src/util/local_profile.js: a v4 uuid without dashes
    const uid = '3f2b8c1e9a7d4e6f8b0c1d2e3f4a5b6c'
    expect(createGame().getLocalProfileUid({ uid })).toEqual(uid)
  })

  test('rejects ids that are missing, too short, too long or not a plain token', () => {
    const game = createGame()
    for (let uid of [undefined, null, 42, '', 'short', 'x'.repeat(65), 'has space1', '../../etc', 'semi;colon1']) {
      expect(game.getLocalProfileUid({ uid })).toBeNull()
    }
  })
})

describe('isValidLocalUsername', () => {
  test('uses the hosted username rules', () => {
    const game = createGame()
    expect(game.isValidLocalUsername('Rebel_Chicken1')).toBe(true)
    expect(game.isValidLocalUsername('x'.repeat(16))).toBe(true)

    expect(game.isValidLocalUsername('x'.repeat(17))).toBe(false)
    expect(game.isValidLocalUsername('')).toBe(false)
    expect(game.isValidLocalUsername('bad name')).toBe(false)
    expect(game.isValidLocalUsername('<script>')).toBe(false)
    expect(game.isValidLocalUsername(undefined)).toBe(false)
  })
})

describe('world lifecycle', () => {
  test('a standalone world is never treated as anonymous, so it is not deleted on shutdown', () => {
    const uuidCreator = '3f2b8c1e-9a7d-4e6f-8b0c-1d2e3f4a5b6c'

    global.env = 'standalone'
    expect(createGame({ creatorUid: uuidCreator }).isCreatedByAnonynmous()).toBe(false)
    expect(createGame({ creatorUid: undefined }).isCreatedByAnonynmous()).toBe(false)

    global.env = 'production'
    expect(createGame({ creatorUid: uuidCreator }).isCreatedByAnonynmous()).toBe(true)
  })

  test('a standalone world stays loaded with nobody connected', () => {
    global.env = 'standalone'
    expect(createGame().canBeShutdown()).toBe(false)

    global.env = 'production'
    expect(createGame().canBeShutdown()).toBe(true)
  })
})
