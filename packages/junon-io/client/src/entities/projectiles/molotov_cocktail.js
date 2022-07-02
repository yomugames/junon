const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")
const Helper = require("./../../../../common/helper")

class MolotovCocktail extends BaseProjectile {

  onProjectileConstructed() {
    // this.game.playSound("shotgun")
  }

  getSpritePath() {
    return 'molotov_cocktail.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.MolotovCocktail
  }

  getConstantsTable() {
    return "Projectiles.MolotovCocktail"
  }

}

module.exports = MolotovCocktail
