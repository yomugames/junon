const User = require("./db/user")
const SectorModel = require("./db/sector")

// The standalone (offline) world registry is the `sectors` table of the
// saves directory's sqlite database, as on hosted servers, where the
// matchmaker creates the row. A row records the world's name, game mode and
// owning local profile.
class StandaloneWorlds {
  // registers a world unless it already is; returns its sector row
  static async register(options) {
    await User.findOrCreate({ where: { uid: options.ownerUid }, defaults: { gold: 0 } })

    let sectorModel = await SectorModel.findOne({ where: { uid: options.uid } })
    if (sectorModel) return sectorModel

    return SectorModel.createOne({
      uid: options.uid,
      name: options.name,
      gameMode: options.gameMode || 'survival',
      creatorUid: options.ownerUid
    })
  }
}

module.exports = StandaloneWorlds
