const BaseProjectile = require("./base_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class MolotovCocktail extends BaseProjectile {

  getType() {
    return Protocol.definition().ProjectileType.MolotovCocktail
  }

  getConstantsTable() {
    return "Projectiles.MolotovCocktail"
  }

  onMoveComplete() {
    this.body.velocity[0] = 0
    this.body.velocity[1] = 0
    this.setPosition(this.destination.x, this.destination.y)

    this.remove()
    this.trigger()
  }

  trigger() {
    this.createFlames()
  }

  getFlameBoundingBox() {
    return this.getNeighborBoundingBox(Constants.tileSize / 2)
  }

  createFlames() {
    let alreadyOnFire = []

    let structures = this.getContainer().structureMap.search(this.getFlameBoundingBox())
    structures.forEach((structure) => {
      if (!structure.isOwnedBy(this.owner)) {
        let level = Math.floor(Math.random() * 4)
        structure.addFire(structure.getEffectLevel("fire") + level, { forceFlamable: true })
      }
      alreadyOnFire.push([structure.getRow(), structure.getCol()])
    })

    let platforms = this.getContainer().platformMap.search(this.getFlameBoundingBox())
    platforms.forEach((platform) => {
      let onStructureOrPlatform = false;
      for (let coordinate in alreadyOnFire) {
        if (alreadyOnFire[coordinate][0] === platform.getRow() && alreadyOnFire[coordinate][1] === platform.getCol()) {
          onStructureOrPlatform = true;
          break;
        }
      }
      if (!onStructureOrPlatform) {
        if (!platform.isOwnedBy(this.owner)) {
          let level = Math.floor(Math.random() * 4)
          platform.addFire(platform.getEffectLevel("fire") + level, { forceFlamable: true })
        }
        alreadyOnFire.push([platform.getRow(), platform.getCol()])
      }
    })

    let terrains = this.getContainer().groundMap.search(this.getFlameBoundingBox())
    terrains.forEach((terrain) => {
      let onStructureOrPlatform = false;
      for (let coordinate in alreadyOnFire) {
        if (alreadyOnFire[coordinate][0] === terrain.row && alreadyOnFire[coordinate][1] === terrain.col) {
          onStructureOrPlatform = true;
          break;
        }
      }
      if (!onStructureOrPlatform && terrain.getTypeName()=='Rock') {
        let level = Math.floor(Math.random() * 4)
        terrain.addFire(terrain.getEffectLevel("fire") + level, { forceFlamable: true })
      }
    })
  }

  remove() {
    this.sector.removeProcessor(this)
    super.remove()
  }


}

module.exports = MolotovCocktail
