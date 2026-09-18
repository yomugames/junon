/*
  Rooms
    a group of tiles would be considered valid room under the following conditions:
      - all edge tiles are walls
  Edge Tile
    if it has less than 4 neighbors (up/left/down/right), it is an edge tile
*/


const Grid = require("./../../common/entities/grid")
const NetworkAssignable = require("./../../common/interfaces/network_assignable")
const IDGeneratorKlass = require('../../server/util/id_generator')
const RoomManager = require('../../server/entities/networks/room_manager')
const PressureManager = require('../../server/entities/networks/pressure_manager')
const FloodFillQueue = require('../../common/entities/flood_fill_queue')
const Constants = require('../../common/constants.json')

// server.js normally sets this global before any entity code runs (see
// server.js's top-level `debugMode = ...`); room.js reads it directly.
global.debugMode = false

const IDGenerator = new IDGeneratorKlass()


class Entity {
  getId() {
    return 1
  } 
}

let entity = new Entity()

class Tile {
  constructor(typeName) {
    this.id = IDGenerator.generate("entity")
    this.typeName = typeName
  }

  getId() {
    return this.id
  }

  hasCategory(category) {
    return this.typeName === category
  }

  isAirtight() {
    return ["door", "wall", "vent"].indexOf(this.typeName) !== -1
  }

  isRoomPartitioner() {
    return ["door", "wall", "vent", "escape_pod"].indexOf(this.typeName) !== -1
  }

  isGroundTile() {
    return this.typeName === "ground"
  }

  getType() {
    return this.typeName
  }

  isStructure() {
    return !this.hasCategory("platform") && !this.hasCategory("wall") && !this.hasCategory("distribution") && !this.hasCategory("ground")
  }

  getStandingPlatform() {
    return this
  }

}

Object.assign(Tile.prototype, NetworkAssignable.prototype, {
})

let oxygenProducerTile  = p = () => { return new Tile("oxygen_producer") } 
let doorTile   = d = () => { return new Tile("door") } 
let wallTile   = w = () => { return new Tile("wall") } 
let ventTile   = v = () => { return new Tile("vent") }  
let groundTile = g = () => { return new Tile("ground") } 
let airtightTile = a = () => { return new Tile("airtight") } 

let blankTile = 0
let roomManager
let oxygenManager
let game
let container

let grid = new Grid("test", {}, 10, 10)

// RoomManager doesn't partition synchronously: partition() only enqueues a
// RoomPartitionRequest, which becomes eligible for processing once the game
// clock has advanced past its debounce window (see RoomPartitionRequest#isReady),
// and then flood-fills neighbor tiles over one or more turns of the shared
// floodFillQueue (see sector.js's real tick loop, which drives the same three
// calls every turn). Simulate enough turns for any pending request to finish.
async function tick(turns = 20) {
  for (let i = 0; i < turns; i++) {
    game.timestamp += Constants.physicsTimeStep + 1
    roomManager.processPartitionRequestQueue()
    container.floodFillQueue.executeTurn()
  }
}

beforeEach(function(done) {
  game = {
    timestamp: 0,
    registerEntity: () => {},
    generateId: (type) => IDGenerator.generate(type),
    captureException: (e) => { throw e }
  }

  let sector = {
    game: game,
    getRowCount() { return grid.getRowCount() },
    getColCount() { return grid.getColCount() },
    getChunk: () => null,
    removeEntityFromTreeByName: () => {}
  }
  game.sector = sector

  container = {
    sector: sector,
    game: game,
    floodFillQueue: new FloodFillQueue(),
    isSector: () => true,
    platformMap: { get: () => null },
    groundMap: { get: () => null },
    homeArea: { addRoomToHomeArea: () => {}, removeFromHomeArea: () => {} },
    getRowCount() {
      return grid.getRowCount()
    },
    getColCount() {
      return grid.getColCount()
    },
    isOutOfBounds(row, col) {
      return row < 0 || row >= this.getRowCount() || col < 0 || col >= this.getColCount()
    },
  }

  container.pressureManager = new PressureManager(container)

  roomManager = new RoomManager(container)
  roomManager.setGrids([grid])
  roomManager.setPlatformGrids([grid])

  done()
});

test('airtight region should create room', async () => {
  let map = [
    [w, w, w],
    [w, g, w],
    [w, w, w]
  ]

  grid.applyMap(map)
  roomManager.partition({ row: 1, col: 2, rowCount: 1, colCount: 1, entity: entity })
  await tick()

  const room = roomManager.getFirstRoom()
  expect(roomManager.getRoomCount()).toEqual(1)
  expect(room.isAirtight()).toEqual(true)
  expect(room.getInnerTileCount()).toEqual(1)
  expect(room.getEdgeTileCount()).toEqual(4)
})

test('non airtight region should not create room', async () => {
  let map = [
    [0, 0, 0 , 0, 0],
    [0, 0, 0 , 0, 0],
    [0, 0, g , 0, 0],
    [0, 0, 0 , 0, 0],
    [0, 0, 0 , 0, 0]
  ]

  grid.applyMap(map)
  roomManager.partition({ row: 1, col: 1, rowCount: 1, colCount: 1, entity: entity })
  await tick()

  const room = roomManager.getFirstRoom()
  expect(roomManager.getRoomCount()).toEqual(0)
  expect(room).toEqual(undefined)
})


test('partition a block more than 1x1', async () => {
  let map = [
    [0, 0, 0 , 0, 0, 0, 0],
    [0, 0, w , w, w, w, w],
    [0, w, g , g, w, w, w],
    [0, 0, w , g, w, g, w],
    [0, 0, 0 , w, 0, w, w]
  ]

  grid.applyMap(map)
  roomManager.partition({ row: 2, col: 4, rowCount: 2, colCount: 1, entity: entity })
  await tick()

  const room = roomManager.getFirstRoom()
  expect(roomManager.getRoomCount()).toEqual(2)
})

test('1 airght room -> remove wall -> no room', () => {
})

test('2 airght rooms -> remove wall -> 1 room', () => {
})



test('1 airght room -> add wall -> 2 airtight rooms', async () => {
  let map = [
    [0, 0, 0, 0, 0, 0],
    [0, w, w, w, w, w],
    [0, w, g, g, g, w],
    [0, 0, w, g, g, w],
    [0, 0, w, w, g, w],
    [0, 0, w, g, g, w],
    [0, 0, w, g, g, w],
    [0, 0, w, w, w, w],
    [0, 0, 0, 0, w, 0],
  ]

  grid.applyMap(map)
  roomManager.partition({ row: 3, col: 2, rowCount: 1, colCount: 1, entity: entity })
  await tick()

  const room = roomManager.getFirstRoom()
  expect(roomManager.getRoomCount()).toEqual(1)
  expect(room.isAirtight()).toEqual(true)
  expect(room.getInnerTileCount()).toEqual(10)

  // add wall
  grid.set({ row: 4, col: 4, value: w })
  roomManager.partition({ row: 4, col: 4, rowCount: 1, colCount: 1, entity: entity })
  await tick()

  expect(roomManager.getRoomCount()).toEqual(2)
})

test('1 vent in room', async () => {
  let map = [
    [0, 0, 0, 0, 0],
    [0, w, w, w, 0],
    [0, v, g, w, 0],
    [0, w, w, w, 0],
    [0, 0, 0, 0, 0]
  ]

  grid.applyMap(map)
  roomManager.partition({ row: 2, col: 1, rowCount: 1, colCount: 1, entity: entity })
  await tick()
  expect(roomManager.getRoomCount()).toEqual(1)

})

test('2 vents in room', async () => {
  let map = [
    [0, 0, 0, 0, 0],
    [0, w, w, w, 0],
    [0, v, g, v, 0],
    [0, w, w, w, 0],
    [0, 0, 0, 0, 0]
  ]

  grid.applyMap(map)
  roomManager.partition({ row: 2, col: 1, rowCount: 1, colCount: 1, entity: entity })
  await tick()
  expect(roomManager.getRoomCount()).toEqual(1)
})

test('2 vents in room added/partitioned incrementally', async () => {
  let map = [
    [0, 0, 0, 0, 0],
    [0, w, w, w, 0],
    [0, v, g, w, 0],
    [0, w, w, w, 0],
    [0, 0, 0, 0, 0]
  ]

  grid.applyMap(map)
  roomManager.partition({ row: 2, col: 1, rowCount: 1, colCount: 1, entity: entity })
  await tick()
  expect(roomManager.getRoomCount()).toEqual(1)

  grid.set({ row: 2, col: 3, value: v })
  roomManager.partition({ row: 2, col: 3, rowCount: 1, colCount: 1, entity: entity })
  await tick()
  expect(roomManager.getRoomCount()).toEqual(1)

})

test('1 producer + 2 vents in room', async () => {
  let map = [
    [0, 0, 0, 0, 0],
    [0, w, w, w, w],
    [0, v, p, g, v],
    [0, w, g, g, w],
    [0, w, w, w, w]
  ]

  grid.applyMap(map)
  roomManager.partition({ row: 2, col: 1, rowCount: 1, colCount: 1, entity: entity })
  await tick()
  expect(roomManager.getRoomCount()).toEqual(1)
})

test('1 producer + 2 vents in room + 1 vent in other room', async () => {
  let map = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, w, w, w, w, w, v, w],
    [0, v, p, g, v, g, g, w],
    [0, w, g, g, w, g, g, w],
    [0, w, w, w, w, w, w, w]
  ]

  grid.applyMap(map)
  roomManager.partition({ row: 2, col: 4, rowCount: 1, colCount: 1, entity: entity })
  await tick()
  expect(roomManager.getRoomCount()).toEqual(2)
})


test('2 oxygen networks', async () => {
  let map = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, w, w, w, w, w, v, w],
    [0, v, p, g, w, g, g, w],
    [0, w, g, g, w, g, g, w],
    [0, w, w, v, w, w, w, w]
  ]

  grid.applyMap(map)
  roomManager.partition({ row: 2, col: 4, rowCount: 1, colCount: 1, entity: entity })
  await tick()
  expect(roomManager.getRoomCount()).toEqual(2)
})

test('2 oxygen networks merge + partition', async () => {
  let map = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, w, w, w, w, w, w, w, 0, 0],
    [0, v, p, g, w, g, g, w, w, w],
    [0, w, g, g, w, g, g, w, g, v],
    [0, w, w, v, w, w, w, w, w, w]
  ]

  grid.applyMap(map)
  roomManager.partition({ row: 2, col: 4, rowCount: 1, colCount: 1, entity: entity })
  await tick()
  roomManager.partition({ row: 3, col: 7, rowCount: 1, colCount: 1, entity: entity })
  await tick()
  expect(roomManager.getRoomCount()).toEqual(3)

  // merge
  grid.set({ row: 3, col: 4, value: v })
  roomManager.partition({ row: 3, col: 4, rowCount: 1, colCount: 1, entity: entity })
  await tick()

  grid.set({ row: 3, col: 7, value: v })
  roomManager.partition({ row: 3, col: 7, rowCount: 1, colCount: 1, entity: entity })
  await tick()

  expect(roomManager.getRoomCount()).toEqual(3)

})

test('3 walls side-by-side built. partition request should only happen once', () => {
})

test('3 walls side-by-side removed. partition request should only happen once', () => {
})

test('walled oxygengenerator. place airlock should not create extra rooms', () => {
})

