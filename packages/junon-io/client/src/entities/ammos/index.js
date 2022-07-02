const Helper = require("./../../../../common/helper")

const Ammos = {}
Ammos.BulletAmmo = require("./bullet_ammo")
Ammos.RifleAmmo = require("./rifle_ammo")
Ammos.ShotgunShell = require("./shotgun_shell")
Ammos.Missile = require("./missile")
Ammos.PlasmaCell = require("./plasma_cell")


Ammos.forType = (type) => {
  const klassName = Helper.getTypeNameById(type)
  return Ammos[klassName]
}

Ammos.getList = () => {
  return [Ammos.BulletAmmo, Ammos.ShotgunShell, Ammos.RifleAmmo, Ammos.Missile, Ammos.PlasmaCell]
}


module.exports = Ammos
