global.env = process.env.NODE_ENV || 'development'
global.debugMode = env === 'development' ? true : false

const PlayerBot = require("./../bots/player_bot")
const Config = require("junon-common/config")
const LOG = require("junon-common/logger")
const request = require("request")
global.allBots = []

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const region = env === 'development' ? 'localhost' : 'nyc1'

const getGameServersList = () => {
  let matchmakerServersUrl = Config[env].matchmakerUrl + "server_status"

  return new Promise((resolve, reject) => {
    request({
      method: 'get',
      url: matchmakerServersUrl,
      json: true
    }, (err, res, body) => {
      if (err) {
        console.log("unable to get gameServer list..")
        resolve({})
      } else {
        let data = body
        if (data.error) {
          console.log(data.error)
          return
        }

        resolve(data)
      }
    })
  })
}

const createBots = async (count) => {
  let botCount = count

  let bots = [] 

  for (var i = 0; i < botCount; i++) {
    let bot = new PlayerBot()
    let result = await bot.connectToMatchmaker()
    if (result.error) {
      console.log(bot.id + " failed to connect to matchmaker")
    } else {
      bots.push(bot)
      allBots.push(bot)
    }
  }

  return bots
}

let bots

let sectorIds = [
  "-LtMhJ-ERHSoYZ0dAsbO",
  "-LtrJHWDX0MtraX77_SC",
  "-M07qVXtqd2U7VH7FRVe",
  "-LusPQDrbzlVlMI5SwE7",
  "-LoVE9wkv7Ljt3BdwEs7",
  "-Ltt74dFA_NgjuVAwC_B",
  "-Lspqu1bWLz2dIIwwUGp",
  "-M4ekB4f41-MIAhYQty7",
  "-M2DlLucCbynCaQn6a3G",
  "-LsmnLBdU3E6got6zK4Q",
  "-M-SZxttVA7TFMWPcJ9o",
  "-M48WbFeKutuDT-YVvyp",
  "-M02gcAyW6ZMC8es5SL1",
  "sJIExjYr06ElV",
  "QE3ZeTF13M1yt",
  "5J9vVaL63E5f2",
  "-Lz_iS8f-yj6j6lwnIgH",
  "-M4OAUnqOcYkit2rq7aa",
  "-LzzPiAf5DYE-I7wKPWB",
  "hOKtP9i3mvzzs",
  "-M-PzG-DQYECxUreXpG7",
  "xjLzDrlUQmHMX",
  "sXclLvSE8gVJS",
  "-M-FVg6GNxK1ARL_WCE_",
  "-M0PfHszAr1p1SCqwKOB",
  "J2HD64RvmQI7F",
  "-LsTsS10MGVPN59EM02w",
  "-LyHiSwZyeLkC-ocVrwR",
  "8zIlKvuUZgpSK",
  "uF4pzaN2s8HpL",
  "8PiuWHGZONDOM",
  "3IXvMnWlpMbNh",
  "Pv7idfulYrfpX",
  "zErdArBquDK6g",
  "0q2VRozkJhxxN",
  "gNnvZiT77P8YN",
  "SB2dodUN6NlPv",
  "aZTD6r0MEQ3n6",
  "isU9aOWLQfUYk",
  "aiLWo34a4HsV5",
  "qbs7w2JihJN4b",
  "FyLDMq8SZuOy1",
  "yebvB8zGucAuN",
  "PKCrkXLBXC41M",
  "xzBxajB5CpxUH",
  "6lZiFw34UXsqS",
  "hFGMioU66wwUt",
  "4omPbiQKOFu4z",
  "GT3aTowWOxQeA",
  "VcWc8vRxih09L",
  "GjkQPGnidzYbf",
  "heBkKoVMh6WTg",
  "3wJEkMePdXHZI",
  "SvV7nE8WI2jHo",
  "ueWmIgPSOozxk",
  "wwwlzim5dkcbg",
  "ytDkxCJmInr4A",
  "8LqrWJ27e2kAZ",
  "IglpZgIEXGx4G",
  "ywHIPiKTxnvYm",
  "fwFrVLbUem5ub"
]

if (env === 'development') {
  sectorIds = [
    "-LtMhJ-ERHSoYZ0dAsbO",
    "-LtrJHWDX0MtraX77_SC",
    "-M07qVXtqd2U7VH7FRVe",
    "-LusPQDrbzlVlMI5SwE7",
    "-LoVE9wkv7Ljt3BdwEs7",
    "-Ltt74dFA_NgjuVAwC_B",
    "-Lspqu1bWLz2dIIwwUGp",
    "-M4ekB4f41-MIAhYQty7",
    "-M2DlLucCbynCaQn6a3G",
    "-LtSu4AxGUW0xANpI96J"
  ]  
}

const run = async () => {
  let gameServers = await getGameServersList()
  let nodes = gameServers[region]
  let firstNode = Object.keys(nodes)[0]
  let gameServerList = Object.keys(gameServers[region][firstNode].servers)

  console.log(gameServerList)
  if (gameServerList.length === 0) {
    console.log("no gameServers..")
    return
  }

  let count = env === 'development' ? 4 : 7 // 61
  let bots = await createBots(count)

   for (var i = 0; i < bots.length; i++) {
     let bot = bots[i]
     bot.bootGame(region, sectorIds[i])
     await sleep(500)
   }

  // wait until boot games has finished, approx 1 minute
  let waitTime = env === 'development' ? 4 : 20
  setTimeout(() => {
    try {
      botsJoinGames(gameServerList)
    } catch(e) {
      LOG.error(e)
    }
  }, waitTime * 1000)
}

const joinSectors = async (bots, sectors) => {
  console.log("bots..joining " + sectors.map((s) => { return s.sectorId }))
  let botIndex = 0
  for (let i = 0; i < sectors.length; i++) {
    let sector = sectors[i]
    let availableSpots = 5 - sector.playerCount
    while (availableSpots > 0) {
      let protocol = env === 'development' ? 'ws://' : "wss://"
      let url = protocol + sector.host
      let bot = bots[botIndex]
      if (bot) {
        bot.joinGameServer(url, { sectorId: sector.sectorId })
        await sleep(500)
        botIndex += 1
      }

      availableSpots -= 1
    }
  }
}

const botsJoinGames = async (gameServerList) => {
  console.log("=== botsJoinGames")

  let botsA = await createBots(4)
   // let botsB = await createBots(30)
   // let botsC = await createBots(30)
   // let botsD = await createBots(30)
   // let botsE = await createBots(32)
   // let botsF = await createBots(32)
   // let botsG = await createBots(32)
   // let botsH = await createBots(32)

  botsA[0].setOnSectorListListener((result) => {
    if (result.region !== region) return

    let sectors = Object.values(result.sectors)
    let sectorsA = sectors.filter((sector) => { return sector.host === gameServerList[0] })
     let sectorsB = sectors.filter((sector) => { return sector.host === gameServerList[1] })
     let sectorsC = sectors.filter((sector) => { return sector.host === gameServerList[2] })
     let sectorsD = sectors.filter((sector) => { return sector.host === gameServerList[3] })
     // let sectorsE = sectors.filter((sector) => { return sector.host === gameServerList[4] })
     // let sectorsF = sectors.filter((sector) => { return sector.host === gameServerList[5] })
     // let sectorsG = sectors.filter((sector) => { return sector.host === gameServerList[6] })
     // let sectorsH = sectors.filter((sector) => { return sector.host === gameServerList[7] })

    joinSectors(botsA, sectorsA)
     // joinSectors(botsB, sectorsB)
     // joinSectors(botsC, sectorsC)
     // joinSectors(botsD, sectorsD)
     // joinSectors(botsE, sectorsE)
     // joinSectors(botsF, sectorsF)
     // joinSectors(botsG, sectorsG)
     // joinSectors(botsH, sectorsH)
  })

  botsA[0].requestSectorList()

}

process.on('SIGINT', () => {
  global.allBots.forEach((bot) => {
    bot.leaveGame()
  })

  allBots = []

  process.exit()
})

run()