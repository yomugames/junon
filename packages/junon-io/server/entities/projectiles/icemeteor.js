const BaseProjectile = require("./base_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")
 const Terrains = require("../terrains/index")

class IceMeteor extends BaseProjectile {

  getType() {
    return Protocol.definition().ProjectileType.IceMeteor
  }

  getConstantsTable() {
    return "Projectiles.IceMeteor"
  }

  onMoveComplete() {
    this.remove()
    this.trigger()
  }

  shouldDisableDelayMove() {
    return true
  }

  trigger() {
    let boundingBox = this.getBoundingBox()
    let targets = this.getAttackables().map((tree) => {
      return tree.search(boundingBox)
    }).flat()

    this.damageTargets(targets)
    this.addDirtToFloors(targets)
    this.createIceAsteroid(boundingBox)
  }

  getCoordsFromBoundingBox(boundingBox) {
    let row = Math.floor((boundingBox.minY + Constants.tileSize / 2) / Constants.tileSize)
    let col = Math.floor((boundingBox.minX + Constants.tileSize / 2) / Constants.tileSize)

    return [
      [row, col],
      [row + 1, col],
      [row    , col + 1],
      [row + 1, col + 1]
    ]
  }

  createIceAsteroid(boundingBox) {
    let coords = this.getCoordsFromBoundingBox(boundingBox)

    let isNotPathBlocker = coords.every((coord) => {
      let row = coord[0]
      let col = coord[1]
      let tile = this.sector.pathFinder.getTile(row, col)
      if (!tile) return true

      let isBlocker = tile.hasCategory("wall") || (tile.isBuilding() && tile.isStructure())
      return !isBlocker
    })

    if (isNotPathBlocker) {
      let chance = Math.random() < 0.2
      if (chance) {
        let row = coords[0][0]
        let col = coords[0][1]
        let platform = this.sector.platformMap.get(row, col)
        if (platform) platform.remove()

        new Terrains.IceAsteroid(this.sector, row, col)
      }
    }
  }


  damageTargets(entities) {
    entities.forEach((entity) => {
      entity.damage(this.getDamage(entity), this)
      if (Math.random() < 0.15) {
        // 30% chance of getting fire
        entity.addFire()
      }
    })
  }

  getDamage(entity) {
    return 15
  }

  addDirtToFloors(targets) {
    let buildings = targets
    buildings.forEach((building) => {
      if (building.hasCategory("platform") && building.isPlatformDirtiable()) {
        let chance = Math.random() < 0.6
        if (chance) {
          let dirtLevel = Math.floor(Math.random() * 4) + 1
          for (var i = 0; i < dirtLevel; i++) {
            building.addDirt()
          }
        }
      }
    })
  }

  getAttackables() {
    return [this.sector.mobTree, this.sector.playerTree, this.sector.buildingTree]
  }

  remove() {
    this.sector.removeProcessor(this)
    super.remove()
  }


}

module.exports = IceMeteor
