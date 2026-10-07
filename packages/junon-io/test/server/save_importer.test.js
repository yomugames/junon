// Importing hosted-game saves for standalone play (junon-common/save_importer.js).
// The saves here are synthetic and built in each supported schema shape:
// real exported saves are player data and are never committed.
const zlib = require('zlib')
const WorldSerializer = require('junon-common/world_serializer')
const SaveImporter = require('junon-common/save_importer')

const OWNER = 'ownerProfile123'

beforeAll(async () => {
  global.env = 'standalone'
  global.debugMode = false
  await WorldSerializer.initSerializer()
})

// a hosted world: Alice founded the main colony (named after the world),
// Bob is a member, Carol runs a second team, Dave was online when it was saved
function buildHostedSave(version, overrides = {}) {
  const save = {
    metadata: Object.assign({ version: version, uid: 'hostedSector1', name: 'Moon Base', gameMode: 'survival', rowCount: 128, colCount: 128 }, overrides.metadata),
    entities: {
      teams: {
        1: { id: 1, name: overrides.mainTeamName || 'Moon Base', creatorUid: 'fbAlice', leaderUid: 'fbAlice' },
        2: { id: 2, name: 'Raiders', creatorUid: 'fbCarol', leaderUid: 'fbCarol' }
      },
      playerDataMap: {
        fbAlice: { uid: 'fbAlice', name: 'Alice', data: { id: 10, uid: 'fbAlice', name: 'Alice', health: 70, team: { id: 1 } } },
        fbBob: { uid: 'fbBob', name: 'Bob', data: { id: 11, uid: 'fbBob', name: 'Bob', health: 5, team: { id: overrides.bobTeamId || 1 } } },
        fbCarol: { uid: 'fbCarol', name: 'Carol', data: { id: 12, uid: 'fbCarol', name: 'Carol', health: 9, team: { id: 2 } } }
      },
      players: {
        13: { id: 13, uid: 'fbDave', name: 'Dave', health: 1, team: { id: 2 } }
      }
    }
  }

  const SaveState = WorldSerializer.getProtocolForVersion(version).SaveState
  return zlib.gzipSync(SaveState.encode(SaveState.fromObject(save)).finish())
}

function decode(compressed) {
  return SaveImporter.decode(compressed).save
}

function allAccountUids(save) {
  const uids = new Set(Object.keys(save.entities.playerDataMap))
  SaveImporter.getCharacters(save).forEach((character) => uids.add(character.uid))
  Object.values(save.entities.teams).forEach((team) => {
    if (team.creatorUid) uids.add(team.creatorUid)
    if (team.leaderUid) uids.add(team.leaderUid)
  })
  return [...uids]
}

function characterNamed(save, name) {
  return SaveImporter.getCharacters(save).find((character) => character.name === name)
}

describe.each([4, 20, 38, 39])('save format v%i', (version) => {
  test('lists every character with the local id import will give it', () => {
    const characters = SaveImporter.listCharacters(buildHostedSave(version))

    expect(characters.map((c) => c.name).sort()).toEqual(['Alice', 'Bob', 'Carol', 'Dave'])
    characters.forEach((character) => expect(SaveImporter.isImportedUid(character.uid)).toBe(true))
    expect(characters.find((c) => c.name === 'Carol').teamName).toEqual('Raiders')
  })

  test('replaces every hosted account id and binds the chosen character to the importer', () => {
    const input = buildHostedSave(version)
    const bob = SaveImporter.listCharacters(input).find((c) => c.name === 'Bob')

    const result = SaveImporter.importSave(input, { ownerUid: OWNER, ownerName: 'Rebel', characterUid: bob.uid, worldId: 'localWorld1' })
    const save = decode(result.compressed)

    expect(allAccountUids(save).filter((uid) => !SaveImporter.isImportedUid(uid) && uid !== OWNER)).toEqual([])
    expect(save.metadata.uid).toEqual('localWorld1')
    expect(result.version).toEqual(version)

    // Bob is the importer's character, with his state
    expect(characterNamed(save, 'Bob').uid).toEqual(OWNER)
    expect(save.entities.playerDataMap[OWNER].name).toEqual('Bob')
    expect(characterNamed(save, 'Bob').health).toEqual(5)

    // the importer owns the main colony; leadership stays with its leader
    const mainTeam = save.entities.teams[1]
    expect(mainTeam.leaderUid).toEqual(characterNamed(save, 'Alice').uid)
    expect(result.mainTeamName).toEqual('Moon Base')
    if (version >= 4) {
      expect(mainTeam.creatorUid).toEqual(OWNER)
      expect(mainTeam.creatorName).toEqual('Rebel')
      expect(save.entities.teams[2].creatorUid).toEqual(characterNamed(save, 'Carol').uid)
    }
  })
})

test('team leadership moves with the chosen character', () => {
  const input = buildHostedSave(38)
  const carol = SaveImporter.listCharacters(input).find((c) => c.name === 'Carol')

  const save = decode(SaveImporter.importSave(input, { ownerUid: OWNER, characterUid: carol.uid }).compressed)

  expect(save.entities.teams[2].leaderUid).toEqual(OWNER)
  expect(save.entities.teams[1].creatorUid).toEqual(OWNER)
})

test('can import without taking over a character', () => {
  const save = decode(SaveImporter.importSave(buildHostedSave(38), { ownerUid: OWNER }).compressed)

  expect(SaveImporter.getCharacters(save).every((c) => SaveImporter.isImportedUid(c.uid))).toBe(true)
  expect(save.entities.teams[1].creatorUid).toEqual(OWNER)
})

test('when no team is named after the world, the team with the most characters is the main team', () => {
  // Bob joined the Raiders: Raiders has Bob, Carol and Dave, the colony only Alice
  const input = buildHostedSave(38, { mainTeamName: 'Renamed Colony', bobTeamId: 2 })
  const result = SaveImporter.importSave(input, { ownerUid: OWNER })
  const save = decode(result.compressed)

  expect(result.mainTeamName).toEqual('Raiders')
  expect(save.entities.teams[2].creatorUid).toEqual(OWNER)
  expect(save.entities.teams[1].creatorUid).not.toEqual(OWNER)
})

test('rejects worlds that cannot be played offline', () => {
  expect(() => SaveImporter.importSave(buildHostedSave(38, { metadata: { gameMode: 'pvp' } }), { ownerUid: OWNER }))
    .toThrow('Unsupported game mode pvp')
})

test('rejects an owner id that looks like an imported character', () => {
  expect(() => SaveImporter.importSave(buildHostedSave(38), { ownerUid: 'imported-1' }))
    .toThrow('local profile id')
})

test('rejects a character that is not in the save', () => {
  expect(() => SaveImporter.importSave(buildHostedSave(38), { ownerUid: OWNER, characterUid: 'imported-99' }))
    .toThrow('Unknown character')
})
