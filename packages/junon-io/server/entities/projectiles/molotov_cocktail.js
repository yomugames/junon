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
    let terrains = this.getContainer().groundMap.search(this.getFlameBoundingBox())
    terrains.forEach((terrain) => {
      if (terrain.isGroundTile()) {
        let level = Math.floor(Math.random() * 4)
        terrain.addFire(level, { forceFlamable: true })
      }
    })
  }

  remove() {
    this.sector.removeProcessor(this)
    super.remove()
  }


}

module.exports = MolotovCocktail
