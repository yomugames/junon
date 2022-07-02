/*
  Rooms
    a group of tiles would be considered valid room under the following conditions:
      - all edge tiles are walls
  Edge Tile
    if it has less than 4 neighbors (up/left/down/right), it is an edge tile
*/


const Grid = require("./../../common/entities/grid")
const NetworkAssignable = require("./../../common/interfaces/network_assignable")
const IDGenerator = require('../../server/util/id_generator')
const RoomManager = require('../../server/entities/networks/room_manager')
const PressureManager = require('../../server/entities/networks/pressure_manager')


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

  getType() {
    return this.typeName
  }

  isStructure() {
    return !this.hasCategory("platform") && !this.hasCategory("wall") && !this.hasCategory("distribution")
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

  let grid = new Grid("test", container, 10,10)

beforeEach(function(done) {
  let container = {}

  let game = {
    registerEntity: () => {}
  }

  let container = {
    sector: {
      game: game
    },
    game: game,
    pressureManager: new PressureManager(),
    getRowCount() {
      return grid.getRowCount()
    },
    getColCount() {
      return grid.getColCount()
    },
  }

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
  await roomManager.partition({ row: 1, col: 2, rowCount: 1, colCount: 1, entity: entity })

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
  await roomManager.partition({ row: 1, col: 1, rowCount: 1, colCount: 1, entity: entity })

  const room = roomManager.getFirstRoom()
  expect(roomManager.getRoomCount()).toEqual(0)
  expect(room).toEqual(undefined)
})

test('room thats get covered by walls inside afterwards should be deallocated', async () => {
  let groundMap = [
    [0, 0, 0 , 0, 0],
    [0, 0, 0 , 0, 0],
    [0, 0, g , g, 0],
    [0, 0, g , g, 0],
    [0, 0, 0 , 0, 0]
  ]

  let wallMap = [
    [0, 0, 0 , 0, 0],
    [0, w, w , w, w],
    [0, w, 0 , 0, w],
    [0, w, 0 , 0, w],
    [0, w, w , w, w]
  ]

  let groundGrid = new Grid("ground", {}, 10,10)
  let wallGrid   = new Grid("wall", {}, 10,10)
  roomManager.setGrids([wallGrid, groundGrid])

  groundGrid.applyMap(groundMap)
  wallGrid.applyMap(wallMap)

  await roomManager.partition({ row: 1, col: 2, rowCount: 1, colCount: 1, entity: entity })

  expect(roomManager.getRoomCount()).toEqual(1)

  // add walls inside
  wallGrid.set({ row: 2, col: 2, value: w })
  wallGrid.set({ row: 2, col: 3, value: w })
  wallGrid.set({ row: 3, col: 2, value: w })
  wallGrid.set({ row: 3, col: 3, value: w })
  roomManager.partition({ row: 3, col: 3, rowCount: 1, colCount: 1, entity: entity })

  expect(roomManager.getRoomCount()).toEqual(0)
})

test('non closed region should not create room', async () => {
  let map = [
    [0, 0, 0 , 0, 0, 0],
    [0, 0, w , w, w, w],
    [0, w, g , g, g, g],
    [0, 0, w , w, w, 0],
    [0, 0, 0 , 0, 0, 0]
  ]

  grid.applyMap(map)
  await roomManager.partition({ row: 3, col: 4, rowCount: 1, colCount: 1, entity: entity })


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
  await roomManager.partition({ row: 2, col: 4, rowCount: 2, colCount: 1, entity: entity } )

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
  await roomManager.partition({ row: 3, col: 2, rowCount: 1, colCount: 1, entity: entity })

  const room = roomManager.getFirstRoom()
  expect(roomManager.getRoomCount()).toEqual(1)
  expect(room.isAirtight()).toEqual(true)
  expect(room.getInnerTileCount()).toEqual(10)

  // add wall
  grid.set({ row: 4, col: 4, value: w })
  await roomManager.partition({ row: 4, col: 4, rowCount: 1, colCount: 1, entity: entity })

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
  await roomManager.partition({ row: 2, col: 1, rowCount: 1, colCount: 1, entity: entity })
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
  await roomManager.partition({ row: 2, col: 1, rowCount: 1, colCount: 1, entity: entity })
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
  await roomManager.partition({ row: 2, col: 1, rowCount: 1, colCount: 1, entity: entity })
  expect(roomManager.getRoomCount()).toEqual(1)

  grid.set({ row: 2, col: 3, value: v })
  await roomManager.partition({ row: 2, col: 3, rowCount: 1, colCount: 1, entity: entity })
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
  await roomManager.partition({ row: 2, col: 1, rowCount: 1, colCount: 1, entity: entity })
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
  await roomManager.partition({ row: 2, col: 4, rowCount: 1, colCount: 1, entity: entity })
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
  await roomManager.partition({ row: 2, col: 4, rowCount: 1, colCount: 1, entity: entity })
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
  await roomManager.partition({ row: 2, col: 4, rowCount: 1, colCount: 1, entity: entity })
  await roomManager.partition({ row: 3, col: 7, rowCount: 1, colCount: 1, entity: entity })
  expect(roomManager.getRoomCount()).toEqual(3)

  // merge
  grid.set({ row: 3, col: 4, value: v })
  await roomManager.partition({ row: 3, col: 4, rowCount: 1, colCount: 1, entity: entity })

  grid.set({ row: 3, col: 7, value: v })
  await roomManager.partition({ row: 3, col: 7, rowCount: 1, colCount: 1, entity: entity })

  expect(roomManager.getRoomCount()).toEqual(3)

})

test('3 walls side-by-side built. partition request should only happen once', () => {
})

test('3 walls side-by-side removed. partition request should only happen once', () => {
})

test('walled oxygengenerator. place airlock should not create extra rooms', () => {
})

