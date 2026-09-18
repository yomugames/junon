const path = require('path')
const protobuf = require('protobufjs')

// The wire protocol carries partial updates: a message names only the fields
// that changed, and both sides decide what to apply with
// `data.hasOwnProperty(field)` (Player#updateInput, RemoteEventHandler,
// BaseBuilding#applyData, the client's syncWithServer paths, ...).
//
// proto3 gives plain scalars *implicit* presence, so a field set to its
// default (0, false, "") is indistinguishable from an absent one. protobufjs
// historically ignored that and serialised any own property, which is what
// makes these presence checks work. Versions from 8.2.0 onwards implement
// proto3 presence properly: `{ controlKeys: 0 }` encodes to zero bytes and
// decodes without an own property, so every one of those checks silently
// flips to the "field absent" branch.
//
// Concretely, that made a desktop client holding no keys (controlKeys 0) look
// to the server like a mobile client: Player#updateInput fell through to the
// mobile branch, set `inputAngle`, and `isUsingMobileControls()` began
// returning true for every desktop player on join.
//
// This pins the behaviour the protocol relies on. If it fails after a
// protobufjs upgrade, the dependency - not this test - is what changed, and
// the presence-checked fields need explicit `optional` presence in the .proto
// before that upgrade can land.
const PROTOCOL_DIR = path.join(__dirname, '../../../junon-common/protocol')

function loadProtocol() {
  return new Promise((resolve, reject) => {
    const root = new protobuf.Root()
    root.resolvePath = function (origin, target) {
      const match = origin.match(/(.*)\/.*\.proto/)
      const directory = match ? match[1] : ''
      return directory.length > 0 ? directory + '/' + target : target
    }
    root.load(path.join(PROTOCOL_DIR, 'app.proto'), (err, loaded) => {
      if (err) return reject(err)
      resolve(loaded.nested.app)
    })
  })
}

// Mirrors SocketUtil#emit/onMessage in junon-common/socket_util.js.
function roundTrip(protocol, eventName, payload) {
  const wrapped = {}
  wrapped[eventName] = payload
  const buffer = protocol.MessageWrapper.encode(wrapped).finish()
  const messageWrapper = protocol.MessageWrapper.decode(buffer)
  return messageWrapper[messageWrapper.kind]
}

let protocol

beforeAll(async () => {
  protocol = await loadProtocol()
})

describe('protobuf field presence', () => {
  it('keeps a scalar set to its zero default distinguishable from an absent one', () => {
    const data = roundTrip(protocol, 'PlayerInput', { controlKeys: 0 })

    expect(data.hasOwnProperty('controlKeys')).toBe(true)
    expect(data.controlKeys).toBe(0)
  })

  it('leaves a field the sender omitted absent', () => {
    const data = roundTrip(protocol, 'PlayerInput', { angle: 90, idle: false })

    expect(data.hasOwnProperty('controlKeys')).toBe(false)
  })

  it('routes a desktop client holding no keys to the desktop branch', () => {
    // Player#updateInput branches on exactly this check, and treats a missing
    // controlKeys as mobile input.
    const idleDesktop = roundTrip(protocol, 'PlayerInput', { controlKeys: 0, pressedKey: undefined })
    expect(idleDesktop.hasOwnProperty('controlKeys')).toBe(true)

    const movingDesktop = roundTrip(protocol, 'PlayerInput', { controlKeys: 4, pressedKey: undefined })
    expect(movingDesktop.hasOwnProperty('controlKeys')).toBe(true)

    const mobile = roundTrip(protocol, 'PlayerInput', { angle: 0, idle: false })
    expect(mobile.hasOwnProperty('controlKeys')).toBe(false)
  })

  it('preserves a false boolean and a zero number in a partial update', () => {
    // BaseBuilding#applyData gates on exactly these, so a value going *to*
    // zero/false is a change that still has to survive the round trip.
    const Building = protocol.Building
    const encoded = Building.encode({ isUnderConstruction: false, buildProgress: 0 }).finish()
    const building = Building.decode(encoded)

    expect(building.hasOwnProperty('isUnderConstruction')).toBe(true)
    expect(building.isUnderConstruction).toBe(false)
    expect(building.hasOwnProperty('buildProgress')).toBe(true)
    expect(building.buildProgress).toBe(0)
    expect(building.hasOwnProperty('colorIndex')).toBe(false)
  })
})
