// Imports a world exported from the hosted game into a standalone saves
// directory (see junon-common/save_importer.js and docs/development.md).
//
//   node packages/junon-io/server/util/tasks/import_save.js <sector.sav> \
//     --saves-dir <dir> --owner <profile uid> [--owner-name <name>] \
//     [--search <text>] [--character <name | imported-N> | --new]
//
// Without --character or --new it lists the save's characters (filtered by
// --search) so you can choose one. The imported world is written to
// <dir>/<worldId>/sector.sav and registered as owned by --owner.
const fs = require("fs")
const path = require("path")

function parseArgs(argv) {
  let options = { positional: [] }
  for (let i = 0; i < argv.length; i++) {
    let arg = argv[i]
    if (arg === "--new") {
      options.new = true
    } else if (arg.startsWith("--")) {
      options[arg.slice(2)] = argv[i + 1]
      i += 1
    } else {
      options.positional.push(arg)
    }
  }
  return options
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

async function main() {
  let options = parseArgs(process.argv.slice(2))
  let file = options.positional[0]
  if (!file || !options["saves-dir"] || !options.owner) {
    fail("usage: import_save.js <sector.sav> --saves-dir <dir> --owner <profile uid> [--owner-name <name>] [--search <text>] [--character <name | imported-N> | --new]")
  }

  // the registry and world files are the standalone ones in --saves-dir
  process.env.NODE_ENV = "standalone"
  process.env.JUNON_SAVES_DIR = path.resolve(options["saves-dir"])
  global.env = "standalone"
  global.debugMode = false

  const WorldSerializer = require("junon-common/world_serializer")
  const SaveImporter = require("junon-common/save_importer")
  const StandaloneWorlds = require("junon-common/standalone_worlds")
  const sequelize = require("junon-common/db/sequelize")
  const syncStandaloneSchema = require("junon-common/db/standalone_schema")

  await WorldSerializer.initSerializer()

  let compressed = fs.readFileSync(file)
  let characters = SaveImporter.listCharacters(compressed)

  if (!options.character && !options.new) {
    let query = (options.search || "").toLowerCase()
    let matches = characters.filter((character) => character.name.toLowerCase().includes(query))
    matches.forEach((character) => {
      console.log(character.uid + "\t" + character.name + (character.teamName ? "\t(" + character.teamName + ")" : ""))
    })
    console.log(matches.length + " of " + characters.length + " characters. Import with --character <name | id>, or --new to start a new character.")
    return
  }

  let characterUid = null
  if (options.character) {
    let lowerName = options.character.toLowerCase()
    let character = characters.find((character) => character.uid === options.character) ||
                    characters.find((character) => character.name.toLowerCase() === lowerName)
    if (!character) fail("No character named " + options.character)
    characterUid = character.uid
  }

  let result = SaveImporter.importSave(compressed, {
    ownerUid: options.owner,
    ownerName: options["owner-name"],
    characterUid: characterUid
  })

  let savePath = WorldSerializer.getSectorSavePath(result.worldId)
  await WorldSerializer.writeToSavesDirectory(savePath, result.compressed)

  await syncStandaloneSchema(sequelize)
  await StandaloneWorlds.register({
    uid: result.worldId,
    name: result.name,
    gameMode: result.gameMode,
    ownerUid: options.owner
  })
  await sequelize.close()

  console.log("Imported \"" + result.name + "\" as world " + result.worldId + " (" + savePath + ")")
  console.log("Main team: " + (result.mainTeamName || "none"))
  console.log("Start it with JUNON_WORLD_ID=" + result.worldId + " JUNON_OWNER_UID=" + options.owner)
}

main().catch((e) => fail(e.message))
