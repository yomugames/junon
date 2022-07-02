const PlayerBot = require("./../bots/player_bot")
const Constants = require("../../common/constants.json")
const Item = require("../../server/entities/item")

beforeAll(async () => {
  const Server = require("../../server/server")
  global.server = new Server()
  await server.run()
  let game = await server.createTestGame()
  game.setPersistent(true)
  return true
})

global.clientPlayer

beforeEach((done) => {
  global.clientPlayer = new PlayerBot(server.getMainGame().sector.getUid())
  global.clientPlayer.onJoin(done)
})

afterEach(() => {
  global.clientPlayer.leaveGame()
})

test('player would not retain ownership of items sent to storage', (done) => {
  let player = server.getMainGame().getMainPlayer()
  let survivalTool = player.inventory.get(0)
  expect(survivalTool.owner).toMatchObject(player)

  player.swapInventory({ 
    sourceStorageId: Constants.inventoryStorageId,  
    sourceIndex: 0,  
    destinationStorageId: player.initialEscapePod.getId(),  
    destinationIndex: 0
  })

  let hasLostOwnership = survivalTool.owner === null
  expect(hasLostOwnership).toEqual(true)
  done()
})

test('rebel lose ownership of item and should not retain item entity', (done) => {
  let land = server.getMainGame().sector.landManager.getFirstLand()
  let row = land.getRandomCoord().split("-")[0]
  let col = land.getRandomCoord().split("-")[1]

  let mobs = server.getMainGame().sector.spawnMob({ 
    x: gridToPos(col), 
    y: gridToPos(row), 
    type: "Rebel", 
    count: 1 
  })

  let rebel = mobs[0]

  let item = rebel.handEquipItem
  expect(item.owner).toEqual(rebel)

  rebel.remove()

  let ownershipTransferedToSector = item.owner === server.getMainGame().sector
  expect(ownershipTransferedToSector).toEqual(true)
  expect(server.getMainGame().getEntity(item.id)).toEqual(undefined)

  done()
})

test('mobs would trigger traps and get damaged', () => {
  let player = server.getMainGame().getMainPlayer()
  player.inventory.store(new Item(player, "SpikeTrap", 1))

  let spikeTrap = player.build({
    type: server.getProtocol().BuildingType.SpikeTrap,
    angle: 0,
    x: gridToPos(player.getCol()),
    y: gridToPos(player.getRow() + 1),
    containerId: server.getMainGame().sector.getId()
  })

  let mobs = server.getMainGame().sector.spawnMob({ 
    x: gridToPos(player.getCol()), 
    y: gridToPos(player.getRow() + 2), 
    type: "Rebel", 
    count: 1 
  })

  let triggerMock = jest.spyOn(spikeTrap, "trigger")

  let rebel = mobs[0]
  rebel.body.velocity = [0, -5]
  for (var i = 0; i < 15; i++) {
    rebel.setPositionFromVelocity()
  }

  expect(triggerMock).toHaveBeenCalled()
  expect(rebel.health).toBeLessThan(rebel.getMaxHealth())
})

function gridToPos(rowOrCol) {
  return rowOrCol * Constants.tileSize + Constants.tileSize / 2  
}
