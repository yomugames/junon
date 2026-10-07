// Standalone (offline desktop / listen-server) mode keeps each world as a
// plain file at <JUNON_SAVES_DIR>/<sectorUid>/sector.sav instead of in S3 or
// the MySQL `sectors.data` column (junon-common/world_serializer.js). The
// bytes are exactly what the hosted game uploaded to S3, so an exported hosted
// save can be dropped into place as-is.
const fs = require('fs')
const os = require('os')
const path = require('path')
const zlib = require('zlib')
const WorldSerializer = require('junon-common/world_serializer')

let savesDir
let previous

beforeEach(async () => {
  savesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'junon-saves-'))
  previous = { env: global.env, debugMode: global.debugMode, savesDir: process.env.JUNON_SAVES_DIR }

  global.env = 'standalone'
  global.debugMode = false
  process.env.JUNON_SAVES_DIR = savesDir

  // standalone never creates an S3 client here; this only loads save schemas
  await WorldSerializer.initSerializer()
})

afterEach(() => {
  global.env = previous.env
  global.debugMode = previous.debugMode
  if (previous.savesDir === undefined) {
    delete process.env.JUNON_SAVES_DIR
  } else {
    process.env.JUNON_SAVES_DIR = previous.savesDir
  }

  fs.rmSync(savesDir, { recursive: true, force: true })
})

function upload(sectorUid, data) {
  return new Promise((resolve) => WorldSerializer.upload(sectorUid, data, resolve))
}

function encodeSave(metadata) {
  let protocol = WorldSerializer.getCurrentProtocol()
  let buffer = protocol.SaveState.encode({
    metadata: Object.assign({ version: WorldSerializer.getVersion(), rowCount: 128, colCount: 128 }, metadata),
    entities: {}
  }).finish()

  return zlib.gzipSync(buffer)
}

test('writes a world to <saves dir>/<uid>/sector.sav and reads back the same bytes', async () => {
  let data = Buffer.from('compressed save bytes')
  await upload('abcDEF123_-', data)

  let filePath = path.join(savesDir, 'abcDEF123_-', 'sector.sav')
  expect(fs.readFileSync(filePath)).toEqual(data)
  expect(await WorldSerializer.hasCloudSavedData('abcDEF123_-')).toBe(true)
  expect(await WorldSerializer.readFile('abcDEF123_-')).toEqual(data)

  // the temp file used for the atomic replace never outlives the write
  expect(fs.readdirSync(path.dirname(filePath))).toEqual(['sector.sav'])
})

test('saving again replaces the previous save', async () => {
  await upload('world1', Buffer.from('first'))
  await upload('world1', Buffer.from('second'))

  expect((await WorldSerializer.readFile('world1')).toString()).toEqual('second')
})

test('reports worlds without a save file as new', async () => {
  expect(await WorldSerializer.hasCloudSavedData('neverSaved')).toBe(false)
})

test('deleting a world removes its save, and deleting a missing one is harmless', async () => {
  await upload('world1', Buffer.from('data'))
  await WorldSerializer.deleteSector('world1')

  expect(await WorldSerializer.hasCloudSavedData('world1')).toBe(false)
  await expect(WorldSerializer.deleteSector('world1')).resolves.toBeUndefined()
})

test('rejects world ids that could escape the saves directory', () => {
  for (let uid of ['../escape', 'a/b', 'a\\b', '..', 'name.sav', '', undefined]) {
    expect(() => WorldSerializer.getSectorSavePath(uid)).toThrow('Invalid sector uid')
  }
})

test('requires a saves directory', () => {
  delete process.env.JUNON_SAVES_DIR
  expect(() => WorldSerializer.getSectorSavePath('world1')).toThrow('JUNON_SAVES_DIR')
})

test('reads name and game mode from the save header', async () => {
  await upload('world1', encodeSave({ uid: 'world1', name: 'My Colony', gameMode: 'peaceful' }))

  let metadata = await WorldSerializer.getSaveMetadata('world1')
  expect(metadata.name).toEqual('My Colony')
  expect(metadata.gameMode).toEqual('peaceful')
})

test('has no save metadata for a world that was never saved', async () => {
  expect(await WorldSerializer.getSaveMetadata('neverSaved')).toBeNull()
})
