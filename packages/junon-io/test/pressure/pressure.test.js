/*
  PressureNetwork - a graph of interconnected rooms 
    - queries: is the network pressurized or not?

*/


const PressureManager = require('../../server/entities/networks/pressure_manager')
const PressureNetwork = require('../../server/entities/networks/pressure_network')
const Pressurable    = require('../../common/interfaces/pressurable')
const PressureSealer = require('../../common/interfaces/pressure_sealer')
const NetworkAssignable = require('../../common/interfaces/network_assignable')
const FloodFillQueue = require('../../common/entities/flood_fill_queue')
const IDGenerator = require('../../server/util/id_generator')

// NetworkManager (PressureManager's base class) reads container.game.sector and
// container.floodFillQueue.getQueue() during construction, even though
// PressureManager itself overrides all of the network-traversal logic that
// would otherwise use them. Network (the base class of PressureNetwork) also
// calls manager.game.generateId() when allocating a new network. Build a
// minimal container/game pair that satisfies just those contracts.
function createContainer() {
  let idGenerator = new IDGenerator()

  let game = {
    generateId(type) {
      return idGenerator.generate(type)
    }
  }
  let sector = { game }
  game.sector = sector

  return {
    game,
    sector,
    floodFillQueue: new FloodFillQueue()
  }
}

// mock class
let uuid = 1

class Room {
  constructor(pressureManager) {
    uuid += 1
    this.id = uuid
    this.initPressurable()
    this.setPressureManager(pressureManager)
  }

  getId() {
    return this.id
  }

  addDoor(door) {
    this.addPressureSealer(door)  
  }
}

Object.assign(Room.prototype, Pressurable.prototype, NetworkAssignable.prototype, {
  // PressureManager#getNeighbors calls the real Room class's
  // getNeighborReachableRooms(), which walks room.js's door-hit bookkeeping.
  // This mock doesn't model that structure, so bridge it onto the generic
  // Pressurable#getNeighborMembers() traversal (neighbors reachable through
  // currently-open sealers), which is the same semantic for this test's purposes.
  getNeighborReachableRooms() {
    return this.getNeighborMembers()
  },

  // PressureNetwork#hasPressure() (see pressure_network.js) asks each member
  // room whether it is airtight and free of an exposed vacuum door, mirroring
  // room.js's isAirtightAndSealed()/getDoorWithVacuum(). This mock has no tile
  // geometry to be "airtight" about, so it only models the vacuum-door half.
  isAirtightAndSealed() {
    return !this.getDoorWithVacuum()
  },

  getDoorWithVacuum() {
    return this.getPressureSealers().find((door) => door.hasVacuum(this))
  },

  getPressureSealers() {
    return Object.values(this.sealers)
  }
})

class Door {
  constructor() {
    uuid += 1
    this.id = uuid
    this.initPressureSealer()
  }

  linkToVacuum() {
    this.vacuum = true
  }

  unlinkFromVacuum() {
    this.vacuum = false
  }
}

Object.assign(Door.prototype, PressureSealer.prototype, {
  // Mirrors the real Airlock#hasVacuum/getVacuumTiles: a door only exposes
  // vacuum while it is actually open (see airlock.js's `if (noPlatform) return
  // this.isOpen`) - linking to vacuum alone just marks it as structurally
  // leading to unsealed space.
  hasVacuum() {
    return this.vacuum && this.isOpen
  }
})

let pressureManager

beforeEach(() => {
  pressureManager = new PressureManager(createContainer())
});

test('a room has no pressureNetwork by default', () => {
  let room = new Room(pressureManager)
  expect(room.pressureNetwork).toEqual(undefined)
})

test('a room with door with vacuum should not be pressurized', () => {
  let room = new Room(pressureManager)
  let door = new Door()
  door.linkToVacuum()
  room.addDoor(door)

  door.open()
  expect(room.pressureNetwork.hasPressure()).toEqual(false)

  door.close()
  expect(room.pressureNetwork.hasPressure()).toEqual(true)
})

/*
  A-B-C-D-E chained through doors, E also bordering vacuum.

  NOTE: PressureNetwork used to track a parent/children subnetwork hierarchy
  (see the still-present but now-unused server/entities/networks/sub_network.js),
  which this test originally asserted on. That hierarchy has since been removed
  from PressureNetwork (it now only exposes hasPressure(), computed on demand -
  see pressure_network.js), so there is no `.parent`/`.children` to assert on
  any more. Rewritten to assert on network membership/count instead, which is
  still real, current behavior.
*/
test('opening a chain of doors merges rooms into one network, closing repartitions it', () => {
  let roomA = new Room(pressureManager)
  let roomB = new Room(pressureManager)
  let doorAB = new Door()
  roomA.addDoor(doorAB)
  roomB.addDoor(doorAB)

  let roomC = new Room(pressureManager)
  let roomD = new Room(pressureManager)
  let doorCD = new Door()
  roomC.addDoor(doorCD)
  roomD.addDoor(doorCD)

  let doorBC = new Door()
  roomB.addDoor(doorBC)
  roomC.addDoor(doorBC)

  let roomE = new Room(pressureManager)
  let doorDE = new Door()
  let doorE = new Door()
  doorE.linkToVacuum()
  roomD.addDoor(doorDE)
  roomE.addDoor(doorDE)
  roomE.addDoor(doorE)

  doorAB.open()
  doorCD.open()
  doorBC.open()
  doorE.open()
  doorDE.open()

  // fully connected chain: every room ends up in the same single network
  expect(pressureManager.getNetworkCount()).toEqual(1)
  expect(roomA.pressureNetwork).toBe(roomE.pressureNetwork)

  doorBC.close()

  // closing the B-C link partitions the chain into two networks again
  expect(pressureManager.getNetworkCount()).toEqual(2)
  expect(roomA.pressureNetwork).toBe(roomB.pressureNetwork)
  expect(roomC.pressureNetwork).toBe(roomE.pressureNetwork)
  expect(roomA.pressureNetwork).not.toBe(roomC.pressureNetwork)
})

test('3 door with same rooms with vacuum. open 3, close 1 should not be pressurized', () => {
  let room = new Room(pressureManager)

  let doorA = new Door()
  let doorB = new Door()
  let doorC = new Door()

  doorA.linkToVacuum()
  doorB.linkToVacuum()
  doorC.linkToVacuum()

  room.addDoor(doorA)
  room.addDoor(doorB)
  room.addDoor(doorC)

  doorA.open()
  doorB.open()
  doorC.open()

  doorA.close()
  expect(room.pressureNetwork.hasPressure()).toEqual(false)
})


test('2 connected rooms with vacuum should not be pressurized', () => {
  let roomA = new Room(pressureManager)
  let roomB = new Room(pressureManager)
  let door = new Door()
  roomA.addDoor(door)
  roomB.addDoor(door)

  let doorWithVacuum = new Door()
  doorWithVacuum.linkToVacuum()
  roomB.addDoor(doorWithVacuum)

  expect(roomA.pressureNetwork).toEqual(undefined)
  expect(roomB.pressureNetwork).toEqual(undefined)

  door.open()

  expect(roomA.pressureNetwork.hasPressure()).toEqual(true)
  expect(roomB.pressureNetwork.hasPressure()).toEqual(true)
  expect(pressureManager.getNetworkCount()).toEqual(1)

  doorWithVacuum.open()

  expect(roomA.pressureNetwork.hasPressure()).toEqual(false)
  expect(roomB.pressureNetwork.hasPressure()).toEqual(false)

  door.close()

  expect(roomA.pressureNetwork.hasPressure()).toEqual(true)
  expect(roomB.pressureNetwork.hasPressure()).toEqual(false)

  expect(pressureManager.getNetworkCount()).toEqual(2)

  door.open()
  expect(roomA.pressureNetwork.hasPressure()).toEqual(false)
  expect(roomB.pressureNetwork.hasPressure()).toEqual(false)
})

test('(A-B-C)-(D-E-F)-(G-H) multiple parents, multiple subnetworks', () => {
  // first group
  let roomA = new Room(pressureManager)
  let roomB = new Room(pressureManager)
  let roomC = new Room(pressureManager)
  let doorB = new Door()
  doorB.linkToVacuum()
  let doorAB = new Door()
  let doorBC = new Door()
  roomA.addDoor(doorAB)
  roomB.addDoor(doorAB)
  roomB.addDoor(doorB)
  roomB.addDoor(doorBC)
  roomC.addDoor(doorBC)


  // second group
  let roomD = new Room(pressureManager)
  let roomE = new Room(pressureManager)
  let roomF = new Room(pressureManager)
  let doorDE = new Door()
  let doorEF = new Door()
  roomD.addDoor(doorDE)
  roomE.addDoor(doorDE)
  roomE.addDoor(doorEF)
  roomF.addDoor(doorEF)

  // third group
  let roomG = new Room(pressureManager)
  let roomH = new Room(pressureManager)
  let doorGH = new Door()
  roomG.addDoor(doorGH)
  roomH.addDoor(doorGH)

  // door links
  let doorCD = new Door()
  let doorEH = new Door()
  roomC.addDoor(doorCD)
  roomD.addDoor(doorCD)
  roomE.addDoor(doorEH)
  roomH.addDoor(doorEH)

  expect(pressureManager.getNetworkCount()).toEqual(0)

  /*
    symbols
      | - closed doors
      . - open doors
      @ - vacuum

    (A|B.C) . (D.E|F)
       .         |
       @      (G|H)

  */

  doorCD.open()
  doorB.open()
  doorDE.open()
  doorBC.open()

  expect(roomB.pressureNetwork.hasPressure()).toEqual(false)
  expect(roomC.pressureNetwork.hasPressure()).toEqual(false)
  expect(roomD.pressureNetwork.hasPressure()).toEqual(false)
  expect(roomE.pressureNetwork.hasPressure()).toEqual(false)

  doorCD.close()

  expect(roomB.pressureNetwork.hasPressure()).toEqual(false)
  expect(roomC.pressureNetwork.hasPressure()).toEqual(false)
  expect(roomD.pressureNetwork.hasPressure()).toEqual(true)
  expect(roomE.pressureNetwork.hasPressure()).toEqual(true)
})

test('A->B->C->vacuum) should not be pressurized + room partition', () => {
  let roomA = new Room(pressureManager)
  let roomB = new Room(pressureManager)
  let roomC = new Room(pressureManager)
  let doorAB = new Door()
  let doorBC = new Door()
  let doorC  = new Door()
  doorC.linkToVacuum()

  roomA.addDoor(doorAB)
  roomB.addDoor(doorAB)
  roomB.addDoor(doorBC)
  roomC.addDoor(doorBC)
  roomC.addDoor(doorC)

  doorAB.open()
  doorBC.open()
  doorC.open()

  expect(roomA.pressureNetwork.hasPressure()).toEqual(false)
  expect(roomB.pressureNetwork.hasPressure()).toEqual(false)
  expect(roomC.pressureNetwork.hasPressure()).toEqual(false)

  doorBC.close()

  expect(roomA.pressureNetwork.hasPressure()).toEqual(true)
  expect(roomB.pressureNetwork.hasPressure()).toEqual(true)
  expect(roomC.pressureNetwork.hasPressure()).toEqual(false)
})

test('(A->B)->(C->D)->vacuum) should not be pressurized + subnetwork partition', () => {
  // let roomA = new Room(pressureManager)
  // let roomB = new Room(pressureManager)
  // pressureManager.allocateNetworks(roomA, roomB)

  // let roomC = new Room(pressureManager)
  // let roomD = new Room(pressureManager)
  // let network = pressureManager.allocateNetworks(roomC, roomD)
  // network.addVacuum(roomD)

  // pressureManager.allocateNetworks(roomB, roomC)

  // let rooms = [roomA, roomB, roomC, roomD]

  // rooms.forEach((room) => {
  //   room.pressureNetwork.calculatePressurized()
  // })

  // expect(roomA.pressureNetwork.isPressurized).toEqual(false)
  // expect(roomB.pressureNetwork.isPressurized).toEqual(false)
  // expect(roomC.pressureNetwork.isPressurized).toEqual(false)
  // expect(roomD.pressureNetwork.isPressurized).toEqual(false)

  // pressureManager.partition(roomB, roomC)

  // rooms.forEach((room) => {
  //   room.pressureNetwork.calculatePressurized()
  // })

  // expect(roomA.pressureNetwork.isPressurized).toEqual(true)
  // expect(roomB.pressureNetwork.isPressurized).toEqual(true)
  // expect(roomC.pressureNetwork.isPressurized).toEqual(false)
  // expect(roomD.pressureNetwork.isPressurized).toEqual(false)
})
