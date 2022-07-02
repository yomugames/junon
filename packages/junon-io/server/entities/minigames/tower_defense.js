const BaseMiniGame = require("./base_minigame")

class TowerDefense extends BaseMiniGame {
  registerHandlers(eventHandler) {
    this.REQUIRED_PLAYER_COUNT = 4
    this.MAX_PLAYER_COUNT = 8

    eventHandler.restartCooldown = 5 * 1000

    this.initMain(eventHandler)
  }

  onIsPrivateChanged(isPrivate) {
    if (isPrivate) {
      this.REQUIRED_PLAYER_COUNT = 1
    }
  }

  getMaxPlayers() {
    return this.MAX_PLAYER_COUNT
  }

  getRequiredPlayerCount() {
    return this.REQUIRED_PLAYER_COUNT
  }

  getAFKLimit() {
    return 5
  }

  canRespawn(player) {
    return player.getTeam() && player.getTeam().getBeds().length > 0
  }

  increaseMobCount() {
    return {
      ifthenelse: {
        if: [
          {
            comparison: {
              value1: "this.getVariable('waveCount') % 20",
              operator: "==",
              value2: 1
            }
          },
          {
            and: {
              comparison: {
                value1: "this.getVariable('waveCount')",
                operator: "!=",
                value2: "1"
              }
            }
          }
        ],
        then: [
          { 
            function: "this.setVariable('mobCount', Math.min(this.getVariable('mobCount') * 2, 30))"
          }
        ],
        else: [

        ]
      }
    }
  }

  canAcceptPlayersMidGame() {
    return true
  }

  increaseMobStats() {
    return {
      ifthenelse: {
        if: [
          {
            comparison: {
              value1: "this.getVariable('waveCount') % 7",
              operator: "==",
              value2: 1
            }
          },
          {
            and: {
              comparison: {
                value1: "this.getVariable('waveCount')",
                operator: "!=",
                value2: "1"
              }
            }
          }
        ],
        then: [
          { 
            commands: [
              `/stat chicken health:*2`,
              `/stat slime health:*2`,
              `/stat guard health:*2`,
              `/stat chemist health:*2`,
              `/stat spider health:*2`,
              `/stat poison_spider health:*2`,
              `/stat cat health:*2`,
              `/kill corpse`
            ]
          },
          {
            function: "this.setVariable('goldMultiplier', this.getVariable('goldMultiplier') + 1)"
          }
        ],
        else: [

        ]
      }
    }
  }

  getIntroCutSceneCondition() {
    return {
      ifthenelse: {
        if: [
          {
            comparison: {
              value1: "this.getVariable('waveCount')",
              operator: "==",
              value2: 1
            }
          },
        ],
        then: [
          { 
            commands: [
              `/scene play StarmancerTDMobSpawn`
            ]
          }
        ],
        else: [

        ]
      }
    }
  }

  getWaveMobSpawnCondition(index, mob) {
    return {
      ifthenelse: {
        if: [
          {
            comparison: {
              value1: "this.getVariable('waveCount') % 7",
              operator: "==",
              value2: index
            }
          },
        ],
        then: [
          { 
            commands: [
              `/spawnmob ${mob} {this.getVariable('mobCount')} 10 107 goal:18349 status:hostile attackables:buildings mapdisplay:true taming:false counter:false path:right`,
              `/spawnmob ${mob} {this.getVariable('mobCount')} 9 64 goal:18349 status:hostile attackables:buildings mapdisplay:true taming:false counter:false`,
              `/spawnmob ${mob} {this.getVariable('mobCount')} 10 20 goal:18349 status:hostile attackables:buildings mapdisplay:true taming:false counter:false`
            ]
          }
        ],
        else: [

        ]
      }
    }
  }

  initMain(eventHandler) {
    eventHandler.addTrigger({
      event: "scene:StarmancerTDMobSpawn:end",
      actions: [
        {
          commands: [
            "/scene play StarmancerTDProtectCore"
          ]
        }
      ]
    })

    eventHandler.addTrigger({
      event: "PlayerJoined",
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
                function: "this.allocateScoreIndexToPlayers(3)"
              },
              { 
                commands: [
                  "/clear {playerId}",
                  "/role {playerId} Worker",
                  "/give {playerId} PocketTrader",
                  "/give {playerId} MiniTurret",
                  "/fly {playerId}",
                  "/gold set {playerId} 5000",
                  "/sidebar {playerId} show",
                  "/sidebar @a set 0 Wave {this.getVariable('waveCount')}",
                  "/sidebar @a set 1 <br>",
                  "/speed {playerId} 14"
                ]
              },
              {
                forEach: {
                  iterator: "this.getAllPlayers()",
                  actions: [
                    {
                      commands: [
                        "/sidebar @a set {this.getScoreIndex({playerId})} {this.getPlayerName({playerId})} §e0"
                      ]
                    }
                  ],
                }
              }
            ],
            else: [
              {
                commands: [
                  "/clear {playerId}",
                  "/sethealth {playerId} 100",
                  "/sidebar {playerId} show",
                  "/sidebar {playerId} set 0 Waiting for Players",
                  "/sidebar {playerId} set 1 0/" + this.MAX_PLAYER_COUNT,
                  "/sidebar {playerId} set 2 <br>",
                  "/speed {playerId} 14"
                ]
              }
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
        this.getWaitingForPlayersAction()
      ]
    })

    eventHandler.addTrigger({
      event: "GameStart",
      actions: [
        {
          commands: [
            "/path set right 62 64 62 103 83 103 83 66",
            "/stat flamethrower_turret range:320 damage:15",
            "/stat missile_turret range:640 damage:75",
            "/stat cat speed:12",
            "/button add UpgradeFlamethrowerTurret",
            "/button add UpgradeMiniTurret",
            "/button label UpgradeMiniTurret Upgrade",
            "/button describe UpgradeMiniTurret Doubles Damage. Costs `5000*(game.entityMenu.selectedEntity.level+1)` gold.",
            "/button attach UpgradeMiniTurret MiniTurret",
            "/button add UpgradeFlamethrowerTurret",
            "/button label UpgradeFlamethrowerTurret Upgrade",
            "/button describe UpgradeFlamethrowerTurret Doubles Damage. Costs `7500*(game.entityMenu.selectedEntity.level+1)` gold.",
            "/button attach UpgradeFlamethrowerTurret FlamethrowerTurret",
            "/button add UpgradeMissileTurret",
            "/button label UpgradeMissileTurret Upgrade",
            "/button describe UpgradeMissileTurret Doubles Damage. Costs `15000*(game.entityMenu.selectedEntity.level+1)` gold.",
            "/button attach UpgradeMissileTurret MissileTurret",
            "/button add UpgradeTeslaCoil",
            "/button label UpgradeTeslaCoil Upgrade",
            "/button describe UpgradeTeslaCoil Doubles Damage. Costs `25000*(game.entityMenu.selectedEntity.level+1)` gold.",
            "/button attach UpgradeTeslaCoil TeslaCoil",
            "/button add SellTower",
            "/button label SellTower Sell",
            "/button describe SellTower Sell for half of current price",
            "/setting isCorpseEnabled false"
          ]
        },
        {
          function: "this.setVariable('isWaveIncoming', false)"
        },
        {
          function: "this.setVariable('mobCount', 5)"
        },
        {
          function: "this.setVariable('waveCount', 0)"
        },
        {
          function: "this.setVariable('goldMultiplier', 1)"
        },
        {
          function: "this.setVariable('costMiniTurret', 5000)"
        },
        {
          function: "this.setVariable('costFlamethrowerTurret', 7500)"
        },
        {
          function: "this.setVariable('costMissileTurret', 15000)"
        },
        {
          function: "this.setVariable('costTeslaCoil', 25000)"
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
      event: "Timer:IncomingWaveTimer:start",
      actions: [ 
        {
          function: "this.setVariable('isWaveIncoming', true)",
        },
        {
          function: "this.setVariable('waveCount', this.getVariable('waveCount') + 1)"
        },
        {
          function: "this.displayRaidWarning()"
        },
        {
          commands: [
            "/sidebar set 0 Wave {this.getVariable('waveCount')}"
          ]
        }
      ]
    })

    eventHandler.addTrigger({
      event: "Timer:IncomingWaveTimer:end",
      actions: [ 
        {
          function: "this.setVariable('isWaveIncoming', false)"
        },
        this.getIntroCutSceneCondition(),
        this.increaseMobStats(),
        this.increaseMobCount(),
        this.getWaveMobSpawnCondition(1, "slime"),
        this.getWaveMobSpawnCondition(2, "chicken"),
        this.getWaveMobSpawnCondition(3, "guard"),
        this.getWaveMobSpawnCondition(4, "cat"),
        this.getWaveMobSpawnCondition(5, "chemist"),
        this.getWaveMobSpawnCondition(6, "spider"),
        this.getWaveMobSpawnCondition(7, "poison_spider"),
        {
          commands: [
            "/sidebar @a set 1 Mobs Remaining: §a{this.getHostileMobCount()}"
          ]
        }
      ]
    })

    this.handleSellTower(eventHandler)

    eventHandler.addTrigger({
      event: "ButtonClicked",
      actions: [ 
        {
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "{name}",
                  operator: "==",
                  value2: "'UpgradeMiniTurret'"
                }
              },
              {
                and: {
                  comparison: {
                    value1: "this.getPlayerGold({playerId})",
                    operator: ">=",
                    value2: "5000 * (this.getLevel({entityId}) + 1)"
                  }
                }
              },
              {
                and: {
                  comparison: {
                    value1: "this.getLevel({entityId})",
                    operator: "<",
                    value2: 4
                  }
                }
              }
            ],
            then: [
              { 
                commands: [
                  "/gold lose {playerId} {5000 * (this.getLevel({entityId}) + 1)}",
                  "/stat {entityId} damage:*2",
                  "/level gain {entityId} 1",
                  "/name set {entityId} Lv. {this.getLevel({entityId}) + 1}"
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
      event: "ButtonClicked",
      actions: [ 
        {
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "{name}",
                  operator: "==",
                  value2: "'UpgradeFlamethrowerTurret'"
                }
              },
              {
                and: {
                  comparison: {
                    value1: "this.getPlayerGold({playerId})",
                    operator: ">=",
                    value2: "7500 * (this.getLevel({entityId}) + 1)"
                  }
                }
              },
              {
                and: {
                  comparison: {
                    value1: "this.getLevel({entityId})",
                    operator: "<",
                    value2: 4
                  }
                }
              }
            ],
            then: [
              { 
                commands: [
                  "/gold lose {playerId} {7500 * (this.getLevel({entityId}) + 1)}",
                  "/stat {entityId} damage:*2",
                  "/level gain {entityId} 1",
                  "/name set {entityId} Lv. {this.getLevel({entityId}) + 1}"
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
      event: "ButtonClicked",
      actions: [ 
        {
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "{name}",
                  operator: "==",
                  value2: "'UpgradeMissileTurret'"
                }
              },
              {
                and: {
                  comparison: {
                    value1: "this.getPlayerGold({playerId})",
                    operator: ">=",
                    value2: "15000 * (this.getLevel({entityId}) + 1)"
                  }
                }
              },
              {
                and: {
                  comparison: {
                    value1: "this.getLevel({entityId})",
                    operator: "<",
                    value2: 4
                  }
                }
              }
            ],
            then: [
              { 
                commands: [
                  "/gold lose {playerId} {15000 * (this.getLevel({entityId}) + 1)}",
                  "/stat {entityId} damage:*2",
                  "/level gain {entityId} 1",
                  "/name set {entityId} Lv. {this.getLevel({entityId}) + 1}"
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
      event: "ButtonClicked",
      actions: [ 
        {
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "{name}",
                  operator: "==",
                  value2: "'UpgradeTeslaCoil'"
                }
              },
              {
                and: {
                  comparison: {
                    value1: "this.getPlayerGold({playerId})",
                    operator: ">=",
                    value2: "25000 * (this.getLevel({entityId}) + 1)"
                  }
                }
              },
              {
                and: {
                  comparison: {
                    value1: "this.getLevel({entityId})",
                    operator: "<",
                    value2: 4
                  }
                }
              }
            ],
            then: [
              { 
                commands: [
                  "/gold lose {playerId} {25000 * (this.getLevel({entityId}) + 1)}",
                  "/stat {entityId} damage:*2",
                  "/level gain {entityId} 1",
                  "/name set {entityId} Lv. {this.getLevel({entityId}) + 1}"
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
      event: "MobKilled",
      actions: [ 
        {
          commands: [
            "/sidebar @a set 1 Mobs Remaining: §a{this.getHostileMobCount()}"
          ]
        },
        {
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "this.getPlayer({attackerId})",
                  operator: "!=",
                  value2: "null"
                }
              },
            ],
            then: [
              {
                function: "this.increasePlayerScore({attackerId}, 10)"
              },
              { 
                commands: [
                  "/gold gain @a {1000 * this.getVariable('goldMultiplier')}",
                  "/sidebar @a set {this.getScoreIndex({attackerId})} {this.getPlayerName({attackerId})} §e{this.getPlayerScore({attackerId})}"
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
      event: "Timer:WaveCheckTimer:tick",
      actions: [ 
        {
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "this.getHostileMobCount()",
                  operator: "==",
                  value2: 0
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
              },
              {
                and: {
                  comparison: {
                    value1: "this.getVariable('isWaveIncoming')",
                    operator: "==",
                    value2: "false"
                  }
                }
              }
            ],
            then: [
              { 
                timer: { 
                  name: "IncomingWaveTimer",
                  duration: 25
                }
              }
            ],
            else: [

            ]
          }
        }
      ]
    })

    eventHandler.addTrigger({
      event: "BuildingDestroyed",
      actions: [ 
        {
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "{entityId}",
                  operator: "==",
                  value2: 18349
                }
              }
            ],
            then: [
              { 
                timer: { 
                  name: "RoundEndTimer",
                  duration: 10
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
          commands: ["/caption title Game ending in {remaining}"]
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
      event: "Timer:RoundStartTimer:end",
      actions: [ 
        {
          function: "this.allocateScoreIndexToPlayers(3)"
        },
        { 
          commands: [
            "/role @a Worker",
            "/give @a PocketTrader",
            "/give @a MiniTurret",
            "/fly @a",
            "/gold set @a 5000",
            "/caption title ",
            "/sidebar @a set 0 Wave 1",
            "/sidebar @a set 1 <br>"
          ]
        },
        {
          forEach: {
            iterator: "this.getAllPlayers()",
            actions: [
              {
                commands: [
                  "/sidebar @a set {this.getScoreIndex({playerId})} {this.getPlayerName({playerId})} §e0"
                ]
              }
            ],
          }
        },
        {
          timer: { 
            name: "WaveCheckTimer",
            duration: 0,
            every: 2
          }
        }
      ]
    })


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

  handleSellTower(eventHandler) {
    eventHandler.addTrigger({
      event: "ButtonClicked",
      actions: [ 
        {
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "{name}",
                  operator: "==",
                  value2: "'SellTower'"
                }
              }
            ],
            then: [
              { 
                ifthenelse: {
                  if: [
                    {
                      comparison: {
                        value1: "this.getPlacerId({entityId})",
                        operator: "==",
                        value2: "'{playerId}'"
                      }
                    }
                  ],
                  then: [
                    { 
                      commands: [
                        "/gold gain {playerId} {this.getVariable('cost' + this.getEntityTypeName({entityId})) * (this.getLevel({entityId}) + 1) / 2}",
                        "/destroy {entityId}"
                      ]
                    }
                  ],
                  else: [
                    { 
                      commands: [
                        "/caption {playerId} subtitle Only owner can sell this tower"
                      ]
                    }
                  ]
                }
              }
            ],
            else: [

            ]
          }
        }
      ]
    })
  }


}

module.exports = TowerDefense