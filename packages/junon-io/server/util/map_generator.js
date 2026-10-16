const noise = require("./perlin")
const Terrains = require("./../entities/terrains/index")
const Buildings = require("./../entities/buildings/index")
const Constants = require('./../../common/constants.json')
const Protocol = require('../../common/util/protocol')
const Grid = require('../../common/entities/grid')
const Helper = require("../../common/helper")
const Steps = require("./steps")

class MapGenerator {
  constructor(sector, groundMap, distanceMap) {
    this.sector = sector
    this.groundMap = groundMap
    this.distanceMap = distanceMap

    this.grounds = {}
    this.liquids = {}

    this.EXPONENTIAL_FACTOR = 3
    this.ASTEROID_ELEVATION_THRESHOLD = 0.2
  }

  regenerate() {
    Steps.run(this.regenerateSteps())
  }

  // the same, in slices of the event loop (Steps.runInSlices), for a new
  // world; onProgress gets the fraction generated
  regenerateInSlices(onProgress) {
    return Steps.runInSlices(this.regenerateSteps(), onProgress)
  }

  *regenerateSteps() {
    this.sector.landManager.cleanup()
    this.sector.poolManager.cleanup()

    if (this.sector.roomManager) {
      this.sector.roomManager.cleanup()
      this.sector.roomManager.isAllocationDisabled = true
    }

    this.heightMap      = new Grid("height", this, this.groundMap.getRowCount(), this.groundMap.getColCount())
    this.caveMap        = new Grid("cave", this, this.groundMap.getRowCount(), this.groundMap.getColCount())
    this.temperatureMap = new Grid("temperature", this, this.groundMap.getRowCount(), this.groundMap.getColCount())

    if (env === 'test')  {
      this.seed = 0.8637987475220252
    } else {
      this.seed = Math.random()
      // console.log("sector " + sector.id + " seed is " + this.seed)
    }

    this.grounds = {}
    this.liquids = {}

    yield* this.generate()

    if (this.sector.roomManager) {
      this.sector.roomManager.isAllocationDisabled = false
    }
  }

  createHeightMap() {
    let octaves = [
      { ratio: 1, frequency: 1}, 
      { ratio: 0.5, frequency: 2 }, 
      { ratio: 0.25, frequency: 4 }
    ]

    let noiseFactor = 70

    return this.createNoiseMap(this.heightMap, octaves, noiseFactor, this.seed)
  }

  createCaveMap() {
    let octaves = [
      { ratio: 1, frequency: 1}, 
      { ratio: 0.5, frequency: 2 },
      { ratio: 0.25, frequency: 4 }
    ]

    let noiseFactor = 30

    return this.createNoiseMap(this.caveMap, octaves, noiseFactor, this.seed)
  }

  createTemperatureMap() {
    let octaves = [
      { ratio: 1, frequency: 1}, 
      { ratio: 0.5, frequency: 4 }, 
    ]

    let noiseFactor = 70

    return this.createNoiseMap(this.temperatureMap, octaves, noiseFactor, this.seed + 15666)
  }

  *createNoiseMap(grid, octaves, noiseFactor, seed) {
    noise.seed(seed)

    let rowCount = grid.getRowCount()
    let colCount = grid.getColCount()

    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        this.setNoise(grid, row, col, octaves, noiseFactor)
      }

      yield (row + 1) / rowCount
    }
  }

  setNoise(grid, row, col, octaves, noiseFactor) {
    let totalNoise = 0

    octaves.forEach((octave) => {
      let value = octave.ratio * noise.simplex2(octave.frequency * row / noiseFactor, 
                                                octave.frequency * col / noiseFactor)
      totalNoise += value
    })

    // translate (-1,1) to (0,2) 
    totalNoise = totalNoise + 1 

    // normalize (0,2) to (0,1)
    totalNoise = totalNoise / 2

    totalNoise = Math.pow(totalNoise, this.EXPONENTIAL_FACTOR)

    grid.set({ row: row, col: col, value: totalNoise })
  }

  *assignTiles() {
    let rowCount = this.groundMap.getRowCount()
    let colCount = this.groundMap.getColCount()

    // first pass, terrain + biomes
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        this.assignTile(row, col)
      }

      yield (row + 1) / rowCount / 2
    }

    // second pass, cave tunnels (only asteroids would be on foreground)
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        this.digCaveTunnel(row, col)
      }

      yield 0.5 + (row + 1) / rowCount / 2
    }
  }

  assignTile(row, col) {
    let elevation   = this.heightMap.get(row, col)
    let temperature = this.temperatureMap.get(row, col).entity

    let x = col * Constants.tileSize + Constants.tileSize/2
    let y = row * Constants.tileSize + Constants.tileSize/2


    if (elevation > this.ASTEROID_ELEVATION_THRESHOLD) {
      // foreground
      if (elevation > (0.70)) {
        if (temperature < 0.05) { 
          new Terrains.Oil(this.sector, row, col)
        } else if (temperature < 0.40) { 
          new Terrains.Rock(this.sector, row, col)
        } else {
          new Terrains.Oil(this.sector, row, col)
        }
      } else if (elevation > (0.60)) {
        let klass = Math.random() < 0.40 ? Terrains.CopperAsteroid : Terrains.Asteroid
        new klass(this.sector, row, col)

      } else if (elevation > (0.30)) {
        let klass = Terrains.Asteroid
        new klass(this.sector, row, col)
      } else {
        let klass = Math.random() < 0.15 ? Terrains.Asteroid : Terrains.Asteroid
        new klass(this.sector, row, col)
      }

    } else {
      this.groundMap.set({ row: row, col: col, value: 0 })
    }
  }

  digCaveTunnel(row, col) {
    let elevation   = this.caveMap.get(row, col)

    if (elevation > this.ASTEROID_ELEVATION_THRESHOLD) {
      let entity = this.groundMap.get(row, col)
      if (entity && entity.isObstacle()) {
        entity.remove()

        new Terrains.Rock(this.sector, row, col) // replace asteroid with rock platform
      }
    }
  }

  registerLiquid(liquid) {
    this.liquids[liquid.getId()] = liquid
  }

  unregisterLiquid(liquid) {
    delete this.liquids[liquid.getId()] 
  }

  registerGround(rock) {
    this.grounds[rock.getId()] = rock
  }

  unregisterGround(rock) {
    delete this.grounds[rock.getId()] 
  }

  *createPlants() {
    let lands = this.sector.landManager.lands
    let landCount = Object.keys(lands).length
    let index = 0

    for (let id in lands) {
      let coord = lands[id].getRandomCoord()
      this.createPlantPatch(coord)

      index += 1
      yield index / landCount
    }
  }

  createPlantPatch(coord, plantCount = 10) {
    let offset = 5
    let rowCol = Helper.getRowColFromCoord(coord)

    for (var y = 0; y < plantCount; y++) {
      let row = rowCol[0] + Math.floor(Math.random() * offset) - Math.floor(Math.random() * offset)
      let col = rowCol[1] + Math.floor(Math.random() * offset) - Math.floor(Math.random() * offset)

      let entity = this.groundMap.get(row, col)
      if (entity && entity.isGroundTile()) {
        // create plant
        let data = {
          x: col * Constants.tileSize + Constants.tileSize/2,
          y: row * Constants.tileSize + Constants.tileSize/2,
          isHarvestable: true
        }
        new Buildings.FiberSeed(data, this.sector)
      }
    }
  }

  findRandomGround() {
    let groundList = Object.keys(this.grounds)
    let index = Math.floor(Math.random() * groundList.length)
    let groundKey = groundList[index]

    return this.grounds[groundKey]
  }

  generateEmpty() {
    // dont create any lands
  }

  convertOldTypeToNewType(oldType) {
    let mapping = {
      "999": 1,
      "1000": 2,
      "1001": 3,
      "1002": 4,
      "1003": 5,
      "1004": 6,
      "1005": 7,
      "1006": 8,
      "1007": 9,
      "1008": 10,
      "1009": 11,
      "1010": 12,
      "1011": 13
    }

    return mapping[oldType]
  }

  generateFromSectorData(rowCount, colCount, entities) {
    if (!entities.terrains) return
      
    for (let i = 0; i < entities.terrains.length; i++) {
      let terrainType = entities.terrains[i]
      if (terrainType !== 0) {
        let terrainTypeName = Helper.getTerrainNameById(terrainType)
        let row = Math.floor(i / colCount)
        let col = i % colCount
        let terrainKlass = Terrains[terrainTypeName]
        new terrainKlass(this.sector, row, col)
      }
    }

    for (let i = 0; i < entities.terrainEntities.length; i++) {
      let data = entities.terrainEntities[i]
      let terrainEntity = this.sector.groundMap.get(data.row, data.col)
      terrainEntity.sync(data)
    }

    this.groupTerrains()
  }
  
  groupTerrains() {
    this.groupLiquids()

    this.groupLands()
  }

  /*
    {
      Rock: [[20,21], [22, 23]],
      Water: [[23,22], [23, 25]]
    }
  */
  generateCustom(data) {
    for (let terrainTypeName in data) {
      let positions = data[terrainTypeName]
      positions.forEach((pos) => {
        let row      = parseInt(pos.row)
        let colStart = parseInt(pos.col.split("-")[0])
        let colEnd   = parseInt(pos.col.split("-")[1]) 
        if (isNaN(colEnd)) colEnd = colStart

        let columnCount = colEnd - colStart + 1
        for (var i = 0; i < columnCount; i++) {
          let col = colStart + i

          let existingEntity = this.groundMap.get(row, col)
          if (existingEntity) {
            existingEntity.remove()
          }

          let terrainKlass = Terrains[terrainTypeName]
          new terrainKlass(this.sector, row, col)
        }
      })
    }
  }

  removeMaps() {
    this.heightMap = null    
    this.caveMap = null
    this.temperatureMap = null
  }

  // each step's share of the time, measured on a 1024 x 1024 map, so the
  // progress it yields moves at a steady pace
  *generate() {
    yield* Steps.weighted(this.createHeightMap(), 0, 0.1)
    yield* Steps.weighted(this.createCaveMap(), 0.1, 0.1)
    yield* Steps.weighted(this.createTemperatureMap(), 0.2, 0.1)
    yield* Steps.weighted(this.assignTiles(), 0.3, 0.2)
    this.removeMaps()
    console.log(`++ terrains generated: ${Object.keys(this.grounds).length}`)

    yield* Steps.weighted(this.groupLiquids(), 0.5, 0.1)
    console.log("++ pools grouped")

    this.createWater()
    console.log("++ water generated")

    yield* Steps.weighted(this.groupLands(), 0.6, 0.35)
    console.log("++ lands grouped")

    yield* Steps.weighted(this.createPlants(), 0.95, 0.05)
    console.log("++ plants created")
  }

  // A tile inside a land (or pool) found earlier is skipped instead of looked
  // up: findOrCreate would just return that land, and the lookup searches
  // every land, which made grouping quadratic in the map's area.
  *groupLands() {
    let grouped = new Set()
    let groundCount = Object.keys(this.grounds).length

    for (let id in this.grounds) {
      let ground = this.grounds[id]
      if (grouped.has(ground.getRow() + "-" + ground.getCol())) continue

      let land = this.sector.landManager.findOrCreateLand(ground)
      land.tiles.forEach((key) => grouped.add(key))
      yield grouped.size / groundCount
    }
  }

  *groupLiquids() {
    let grouped = new Set()
    let liquidCount = Object.keys(this.liquids).length

    for (let id in this.liquids) {
      let liquid = this.liquids[id]
      if (grouped.has(liquid.getRow() + "-" + liquid.getCol())) continue

      let pool = this.sector.poolManager.findOrCreatePool(liquid)
      Object.keys(pool.tiles).forEach((key) => grouped.add(key))
      yield grouped.size / liquidCount
    }
  }

  createWater() {
    let index = 0

    for (let id in this.sector.poolManager.pools) {
      let pool = this.sector.poolManager.pools[id]
      if (index % 2 === 0) { // 50% water
        pool.changeTerrainType(Terrains.Water)
      }  

      index += 1
    }
  }

}

module.exports = MapGenerator