const User = require("./db/user")
const SectorModel = require("./db/sector")

const GAME_MODES = ['peaceful', 'survival', 'hardcore']

// The standalone (offline) world registry is the `sectors` table of the
// saves directory's sqlite database, as on hosted servers, where the
// matchmaker creates the row. A row records the world's name, game mode and
// owning local profile.
class StandaloneWorlds {
  // registers a world unless it already is; returns its sector row
  static async register(options) {
    // hosted worlds that never had a mode chosen are saved as "default"
    let isModeSet = options.gameMode && options.gameMode !== 'default'
    let gameMode = isModeSet ? options.gameMode : 'survival'
    if (GAME_MODES.indexOf(gameMode) === -1) {
      throw new Error("Unsupported game mode " + gameMode)
    }

    await User.findOrCreate({ where: { uid: options.ownerUid }, defaults: { gold: 0 } })

    let sectorModel = await SectorModel.findOne({ where: { uid: options.uid } })
    if (sectorModel) return sectorModel

    return SectorModel.createOne({
      uid: options.uid,
      name: options.name,
      gameMode: gameMode,
      creatorUid: options.ownerUid
    })
  }
}

module.exports = StandaloneWorlds
