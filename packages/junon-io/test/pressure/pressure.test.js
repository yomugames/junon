/*
  PressureNetwork - a graph of interconnected rooms 
    - queries: is the network pressurized or not?

*/


const PressureManager = require('../../server/entities/networks/pressure_manager')
const PressureNetwork = require('../../server/entities/networks/pressure_network')
const Pressurable    = require('../../common/interfaces/pressurable')
const PressureSealer = require('../../common/interfaces/pressure_sealer')

// mock class
let uuid = 1

class Room {
  constructor(pressureManager) {
    uuid += 1
    this.id = uuid
    this.initPressurable()
    this.setPressureManager(pressureManager)
  }

  addDoor(door) {
    this.addPressureSealer(door)  
  }
}

Object.assign(Room.prototype, Pressurable.prototype, {
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
  hasVacuum() {
    return this.vacuum
  }
})

let pressureManager

beforeEach(() => {
  pressureManager = new PressureManager()
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
  expect(room.pressureNetwork.isPressurized).toEqual(false)

  door.close()
  expect(room.pressureNetwork.isPressurized).toEqual(true)
})

/*
  bef: (A|B)|(C|D)|(E-@)
  aft: (A|B).(C|D)|(E.@)
*/
test('children count of parentSubNetwork should be correct on partition', () => {
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
  expect(pressureManager.getNetworkCount()).toEqual(3)

  let parentSubNetwork = roomA.pressureNetwork.parent
  expect(Object.values(parentSubNetwork.children).length).toEqual(3)

  doorBC.close()
  expect(Object.values(parentSubNetwork.children).length).toEqual(2)
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
  expect(room.pressureNetwork.isPressurized).toEqual(false)
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

  expect(roomA.pressureNetwork.isPressurized).toEqual(true)
  expect(roomB.pressureNetwork.isPressurized).toEqual(true)
  expect(pressureManager.getNetworkCount()).toEqual(1)

  doorWithVacuum.open()

  expect(roomA.pressureNetwork.isPressurized).toEqual(false)
  expect(roomB.pressureNetwork.isPressurized).toEqual(false)

  door.close()

  expect(roomA.pressureNetwork.isPressurized).toEqual(true)
  expect(roomB.pressureNetwork.isPressurized).toEqual(false)

  expect(pressureManager.getNetworkCount()).toEqual(2)

  door.open()
  expect(roomA.pressureNetwork.isPressurized).toEqual(false)
  expect(roomB.pressureNetwork.isPressurized).toEqual(false)
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

  expect(roomB.pressureNetwork.isPressurized).toEqual(false)
  expect(roomC.pressureNetwork.isPressurized).toEqual(false)
  expect(roomD.pressureNetwork.isPressurized).toEqual(false)
  expect(roomE.pressureNetwork.isPressurized).toEqual(false)

  doorCD.close()

  expect(roomB.pressureNetwork.isPressurized).toEqual(false)
  expect(roomC.pressureNetwork.isPressurized).toEqual(false)
  expect(roomD.pressureNetwork.isPressurized).toEqual(true)
  expect(roomE.pressureNetwork.isPressurized).toEqual(true)
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

  expect(roomA.pressureNetwork.isPressurized).toEqual(false)
  expect(roomB.pressureNetwork.isPressurized).toEqual(false)
  expect(roomC.pressureNetwork.isPressurized).toEqual(false)

  doorBC.close()

  expect(roomA.pressureNetwork.isPressurized).toEqual(true)
  expect(roomB.pressureNetwork.isPressurized).toEqual(true)
  expect(roomC.pressureNetwork.isPressurized).toEqual(false)
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
