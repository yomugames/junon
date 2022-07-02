const Helper = require('../../../common/helper')

const Projectiles = {}

Projectiles.BasicLaser = require("./basic_laser")
Projectiles.CannonBall = require("./cannon_ball")
Projectiles.Rock = require("./rock")
Projectiles.LightLaser = require("./light_laser")
Projectiles.VoidRayLight = require("./void_ray_light")
Projectiles.Missile = require("./missile")
Projectiles.IonBeam = require("./ion_beam")
Projectiles.MiningBeam = require("./mining_beam")
Projectiles.BlasterLaser = require("./blaster_laser")
Projectiles.Bullet = require("./bullet")
Projectiles.ShotgunBullet = require("./shotgun_bullet")
Projectiles.RifleBullet = require("./rifle_bullet")
Projectiles.CarbonGas = require("./carbon_gas")
Projectiles.DisinfectingGas = require("./disinfecting_gas")
Projectiles.Flame = require("./flame")
Projectiles.AcidSpit = require("./acid_spit")
Projectiles.Spike = require("./spike")
Projectiles.Grenade = require("./grenade")
Projectiles.Explosion = require("./explosion")
Projectiles.PoisonGrenade = require("./poison_grenade")
Projectiles.PoisonGas = require("./poison_gas")
Projectiles.Meteor = require("./meteor")
Projectiles.TeslaLaser = require("./tesla_laser")
Projectiles.MolotovCocktail = require("./molotov_cocktail")
Projectiles.PlasmaBullet = require("./plasma_bullet")
Projectiles.Bubble = require("./bubble")

Projectiles.forType = (type) => {
  const klassName = Helper.getProjectileNameById(type)
  return Projectiles[klassName]
}


module.exports = Projectiles
