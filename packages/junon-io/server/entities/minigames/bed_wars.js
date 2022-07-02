const BaseMiniGame = require("./base_minigame")

class BedWars extends BaseMiniGame {
  registerHandlers(eventHandler) {
    this.REQUIRED_PLAYER_COUNT = 4
    this.MAX_PLAYER_COUNT = 4

    eventHandler.restartCooldown = 5 * 1000

    this.initMain(eventHandler)
  }

  canRespawn(player) {
    return player.getTeam() && player.getTeam().getBeds().length > 0
  }

  initMain(eventHandler) {
    eventHandler.addTrigger({
      event: "PlayerDestroyed",
      actions: [
        {
          function: "this.throwPlayerInventoryExceptSurvivalTool({playerId})"
        }
      ]
    })

    eventHandler.addTrigger({
      event: "PlayerJoined",
      actions: [
        {
          commands: [
            "/clear {playerId}",
            "/sethealth {playerId} 100",
            "/sidebar {playerId} show",
            "/sidebar {playerId} set 0 Waiting for Players",
            "/sidebar {playerId} set 1 0/" + this.MAX_PLAYER_COUNT,
            "/sidebar {playerId} set 2 <br>",
            "/speed {playerId} 10"
          ]
        }
      ]
    })

    eventHandler.addTrigger({
      event: "Timer:RoundEndTimer:start",
      actions: [ 
        { 
          function: "this.endRoundStart()"
        }
      ]
    })

    eventHandler.addTrigger({
      event: "Timer:RoundEndTimer:tick",
      actions: [ 
        { 
          commands: ["/caption subtitle Game ending in {remaining}"]
        }
      ]
    })

    eventHandler.addTrigger({
      event: "Timer:RoundEndTimer:end",
      actions: [ 
        { 
          function: "this.endRound()"
        }
      ]
    })

    eventHandler.addTrigger({
      event: "PlayerLeft",
      actions: [
        {
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "this.isRoundStarted",
                  operator: "==",
                  value2: "true"
                }
              }
            ],
            then: [
              {
                commands: [
                  "/sidebar @a set {this.getTeamIndex({playerId})} §{this.getTeamColor({playerId})}{this.getTeamName({playerId})} §c[Dead]",
                ]
              }
            ],
            else: [
            ]
          }
        }
      ]
    })

    eventHandler.addTrigger({
      event: "PlayerDestroyed",
      actions: [
        {
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "{canRespawn}",
                  operator: "==",
                  value2: "false"
                }
              },
            ],
            then: [
              {
                commands: [
                  "/sidebar @a set {this.getTeamIndex(playerId)} §{this.getTeamColor(playerId)}{this.getTeamName(playerId)} §c[Dead]",
                  "/caption title {this.getTeamName({playerId})} is eliminated"
                ]
              }
            ],
            else: [

            ]
          }
        }
      ]
    })

    eventHandler.addTrigger({
      event: "PlayerCountChanged",
      actions: [
        {
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "this.getPlayerCount()",
                  operator: ">=",
                  value2: this.REQUIRED_PLAYER_COUNT
                }
              },
              {
                and: {
                  comparison: {
                    value1: "this.isPublicGame()",
                    operator: "==",
                    value2: "true"
                  }
                }
              }
            ],
            then: [
              { 
                timer: { 
                  name: "RoundStartTimer",
                  duration: 5
                }
              }
            ],
            else: [

            ],
          }
        }
      ]
    })

    eventHandler.addTrigger({
      event: "AlivePlayerCountChanged",
      actions: [
        this.getWinCondition(),
        this.getWaitingForPlayersAction()
      ]
    })

    eventHandler.addTrigger({
      event: "GameStart",
      actions: [
        {
          commands: [
            "/region setowner Blue_Base ",
            "/region setowner Green_Base ",
            "/region setowner Black_Base ",
            "/region setowner White_Base ",
            "/region setowner Ventilators_1 ",
            "/region setowner Ventilators_2 ",
            "/region setowner Ventilators_3 ",
            "/region setowner Ventilators_4 ",
            "/region setowner middle_island ",
            "/interact @b[type=SolarPanel] unown",
            "/interact 3444 generate Meteorite",
            "/interact 561 generate Meteorite",
            "/interact 579 generate Meteorite",
            "/interact 518 generate Meteorite",
            "/interact @b[type=MiningDrill] processingrate 2",
            "/interact 3444 processingrate 5",
            "/interact 561 processingrate 5",
            "/interact 579 processingrate 5",
            "/interact 518 processingrate 5",
            "/setowner 433 Green_Team",
            "/setowner 435 White_Team",
            "/setowner 427 Blue_Team",
            "/setowner 430 Black_Team",
            "/setowner 432 Green_Team",
            "/setowner 434 White_Team",
            "/setowner 428 Blue_Team",
            "/setowner 429 Black_Team",
            "/team scoreindex Blue_Team 3",
            "/team scoreindex Green_Team 4",
            "/team scoreindex Black_Team 5",
            "/team scoreindex White_Team 6",
            "/team scorecolor Blue_Team 9",
            "/team scorecolor Green_Team a",
            "/team scorecolor Black_Team e",
            "/team scorecolor White_Team f"
          ]
        }
      ]
    })

    eventHandler.addTrigger({
      event: "Timer:RoundStartTimer:tick",
      actions: [ 
        { 
          commands: ["/caption title Round starting in {remaining}"]
        }
      ]
    })


    eventHandler.addTrigger({
      event: "Timer:RoundStartTimer:end",
      actions: [ 
        { 
          commands: [
            "/give @a survival_tool",
            "/give @a tiled_floor 20",
            "/clear @b[type=MiningDrill]",
            "/team join Blue_Team @r[c=1,team=Bedwars]",
            "/team join Green_Team @r[c=1,team=Bedwars]",
            "/team join Black_Team @r[c=1,team=Bedwars]",
            "/team join White_Team @r[c=1,team=Bedwars]",
            "/suitcolor @a[c=1,team=Blue_Team] blue",
            "/suitcolor @a[c=1,team=Green_Team] green",
            "/suitcolor @a[c=1,team=White_Team] gray",
            "/suitcolor @a[c=1,team=Black_Team] black",
            "/interact @b[type=MiningDrill] unown",
            "/respawn @a",
            "/sidebar @a set 0 Time Remaining",
            "/sidebar @a set 3 §9Blue_Team  ",
            "/sidebar @a set 4 §aGreen_Team ",
            "/sidebar @a set 5 §eBlack_Team ",
            "/sidebar @a set 6 §fWhite_Team ",
            "/caption title "
          ]
        },
        {
          timer: { 
            name: "SuddenDeathTimer",
            duration: 60*10
          }
        }
      ]
    })


    eventHandler.addTrigger({
      event: "Timer:GoldGeneratorTimer:tick",
      actions: [ 
        { 
          commands: ["/gold gain @a 1"]
        }
      ]
    })

    eventHandler.addTrigger({
      event: "Timer:SuddenDeathTimer:tick",
      actions: [ 
        { 
          commands: ["/sidebar @a set 1 §a{this.stringifyTimeShort({remaining})}"]
        }
      ]
    })

    eventHandler.addTrigger({
      event: "Timer:SuddenDeathTimer:end",
      actions: [ 
        { 
          commands: [
            "/sethealth @b[type=Bed] 0",
            "/caption title Sudden Death",
            "/caption subtitle No more respawn. Kill everyone."
          ]
        }
      ]
    })
  }

  getWinCondition() {
    return {
      ifthenelse: {
        if: [
          {
            comparison: {
              value1: "this.getAlivePlayerCount()",
              operator: "<=",
              value2: 1
            }
          },
          {
            and: {
              comparison: {
                value1: "this.isRoundStarted",
                operator: "==",
                value2: "true"
              }
            }
          }
        ],
        then: [
          {
            commands: ["/caption title {this.getAliveTeam()} wins"]
          },
          { 
            timer: { 
              name: "RoundEndTimer",
              duration: 10
            }
          }
        ],
        else: [

        ]
      }
    }
  }

  getWaitingForPlayersAction() {
    return {
      ifthenelse: {
        if: [
          {
            comparison: {
              value1: "this.getAlivePlayerCount()",
              operator: "<=",
              value2: this.REQUIRED_PLAYER_COUNT
            }
          },
          {
            and: {
              comparison: {
                value1: "this.isRoundStarted",
                operator: "==",
                value2: "false"
              }
            }
          }
        ],
        then: [
          {
            commands: ["/sidebar @a set 1 §a{this.getPlayerCount()}/" + this.MAX_PLAYER_COUNT]
          }
        ],
        else: [

        ]
      }
    }
  }


}

module.exports = BedWars