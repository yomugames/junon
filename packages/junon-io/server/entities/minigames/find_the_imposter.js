const Protocol = require('../../../common/util/protocol')
const MiniGameObjectives = require("../minigame_objectives")
const BaseMiniGame = require("./base_minigame")

class FindTheImposter extends BaseMiniGame {
  registerHandlers(eventHandler) {
    this.REQUIRED_PLAYER_COUNT = 5

    this.name = 'find_the_imposter'
    this.game = eventHandler.game
    this.sector = this.game.sector
    this.eventHandler = eventHandler

    this.initBodyReported(eventHandler)
    this.initEmergencyMeeting(eventHandler)
    this.initGameStart(eventHandler)
    this.initMain(eventHandler)
    this.initFire(eventHandler)
    this.registerVoteEndedHandler(eventHandler)
    this.addTranslations(eventHandler)

    this.isLightHacked = false
  }

  setLightHacked(isLightHacked) {
    this.isLightHacked = isLightHacked
  }

  addTranslations(eventHandler) {
    i18n.instances["ja"].extend({
      "Body Reported": "死体が報告されました。",
      "Crew Wins": "クルーの勝利",
      "Emergency Meeting": "緊急会議",
      "Imposter Wins": "スパイの勝利",
      "Who is the imposter....": "スパイは誰。。。？",
      "It is the imposter": "彼がスパイでした。",
      "It is not the imposter": "彼はスパイではありませんでした。",
      "Role: Crew": "役職: クルー",
      "Goal: Complete all tasks": "目標: 全てのタスクを達成せよ",
      "Role: Imposter": "役職: スパイ",
      "Goal: Kill crew members": "目標: クルーを全員殺害せよ",
      "Voting Skipped": "投票がスキップされました。"
    })

  }

  getRequiredPlayerCount() {
    return this.REQUIRED_PLAYER_COUNT
  }

  getMaxPlayers() {
    return 7
  }

  canRespawn(player) {
    return false
  }

  initBodyReported(eventHandler) {
    eventHandler.addTrigger({
      event: "scene:BodyReported:end",
      actions: [
        {
          function: "this.startVote()"
        }
      ]
    })

    eventHandler.addTrigger({
      event: "Timer:BodyReportedTimer:start",
      actions: [
        {
          commands: ['/caption title Body Reported']
        }
      ]
    })

    eventHandler.addTrigger({
      event: "Timer:BodyReportedTimer:tick",
      actions: [ 
        { 
          commands: [
            "/caption @a subtitle Meeting in {remaining}",
            "/caption @a[locale=ja] subtitle {remaining} 秒後に会議が始まります。",
          ]
        }
      ]
    })

    eventHandler.addTrigger({
      event: "Timer:BodyReportedTimer:end",
      actions: [ 
        { 
          commands: [
            "/caption title ",
            "/caption subtitle ",
            "/scene play EmergencyMeeting",
            "/tp @a 37 70 room",
            "/playsound meeting"
          ]
        },
        {
          function: "this.pauseCooldown()"
        }
      ]
    })
  }

  initEmergencyMeeting(eventHandler) {
    eventHandler.addTrigger({
      event: "scene:EmergencyMeeting:end",
      actions: [
        {
          function: "this.startVote()"
        }
      ]
    })

    eventHandler.addTrigger({
      event: "Timer:EmergencyMeetingTimer:start",
      actions: [
        {
          commands: ['/caption title Emergency Meeting']
        }
      ]
    })

    eventHandler.addTrigger({
      event: "Timer:EmergencyMeetingTimer:tick",
      actions: [ 
        { 
          commands: [
            "/caption subtitle in {remaining}",
            "/caption @a[locale=ja] subtitle 開始まで {remaining}秒",
          ]
        }
      ]
    })

    eventHandler.addTrigger({
      event: "Timer:EmergencyMeetingTimer:end",
      actions: [ 
        { 
          commands: [
            "/caption title ",
            "/caption subtitle ",
            "/scene play EmergencyMeeting",
            "/tp @a 37 70 room",
            "/playsound meeting"
          ]
        },
        {
          function: "this.pauseCooldown()"
        }
      ]
    })
  }

  getNeedsTranslationCommands() {
    let translations = [
      {id: 1051, locale: 'ja', text: '助けて...血液パックがないと死んでしまう....'},
      {id: 1059, locale: 'ja', text: 'ウォッカを飲みたいねえ。'},
      {id: 1060, locale: 'ja', text: 'レクター流ディナーってなんか美味そうじゃん。 1つちょうだい。'},
      {id: 1184, locale: 'ja', text: '中毒になってしまいました。解毒薬を下さい。'}
    ]

    let commands = translations.map((translation) => {
      let id = translation.id
      delete translation["id"]
      return `/dialogue assign ${id} ${JSON.stringify(translation)}`
    })

    return {
      rawCommands: commands
    }
  }

  getSignTranslationCommands() {
    let translations = [
      {id: 2058, locale: 'ja', text: '[緊急事態] \n帝国が我々を抹殺すべく、\nこのコロニーにスパイを送り込んだとの情報を入手した。 つまり我々の内1人がスパイだということになる。 \nもしクルーの死体を発見したら、 直ちに通信機を使って報告し、 緊急会議を開いてスパイを見つけ出せ!'},
      {id: 2051, locale: 'ja', text: 'スポーンルーム' },
      {id: 1475, locale: 'ja', text: '武器庫' },
      {id: 6666, locale: 'ja', text: 'エンジンルーム' },
      {id: 6740, locale: 'ja', text: '生物学研究室' },
      {id: 5663, locale: 'ja', text: '猿' },
      {id: 5662, locale: 'ja', text: '蜘蛛' },
      {id: 5661, locale: 'ja', text: '寄生体' },
      {id: 5660, locale: 'ja', text: 'スライム' },
      {id: 4579, locale: 'ja', text: '会議室' },
      {id: 5187, locale: 'ja', text: 'ダイニングルーム' },
      {id: 7404, locale: 'ja', text: 'キッチン' },
      {id: 7428, locale: 'ja', text: '←食料と種の倉庫' },
      {id: 7421, locale: 'ja', text: '↑食料と種の倉庫' },
      {id: 7384, locale: 'ja', text: '→ダイニングルーム' },
      {id: 7357, locale: 'ja', text: '農業エリア' },
      {id: 7397, locale: 'ja', text: '農業エリア' },
      {id: 287,  locale: 'ja', text: '化学研究室' },
      {id: 6196, locale: 'ja', text: '牢獄' },
      {id: 2921, locale: 'ja', text: '酸素供給室' },
      {id: 9237, locale: 'ja', text: '[処刑室]\nスパイだと疑われる者は\n宇宙空間に追放するか、\nここで焼却処分すること。' },
      {id: 4042, locale: 'ja', text: 'ルーム1' },
      {id: 4043, locale: 'ja', text: 'ルーム2' },
      {id: 4046, locale: 'ja', text: 'ルーム5' },
      {id: 93,   locale: 'ja', text: 'ルーム6' }
    ]

    let commands = translations.map((translation) => {
      let id = translation.id
      delete translation["id"]
      return `/interact ${id} content ${JSON.stringify(translation)}`
    })

    return {
      rawCommands: commands
    }
  }

  initGameStart(eventHandler) {
    eventHandler.addTrigger({
      event: "GameStart",
      actions: [
        {
          commands: [
            "/team add imposter",
            "/tp 143 20 66",
            "/effect give 6121 smoke",
            "/needs assign 2568 bread",
            "/dialogue assign 1051 Pls help..I need some blood pack...",
            "/needs assign 1051 blood_pack",
            "/dialogue assign 1059 I want some vodka",
            "/needs assign 1059 vodka",
            "/dialogue assign 1060 Lecters Dinner looks delicious. I'll have one",
            "/needs assign 1060 lecters_dinner",
            "/dialogue assign 1184 Im poisoned. Gimme antidote..",
            "/needs assign 1184 antidote",
            "/interact 9101 angle 32",
            "/interact 9102 angle 15",
            "/interact 9103 angle -6",
            "/interact 9104 angle -25",
            "/interact 9250 angle 147",
            "/interact 9258 angle 164",
            "/interact 9259 angle -175",
            "/interact 9260 angle -156"
          ]
        },
        this.getSignTranslationCommands(),
        this.getNeedsTranslationCommands()
      ]
    })

  }

  emitFixLights() {
    this.game.forEachPlayer((player) => {
      this.game.eventManager.emitEvent(player, "FixLights")
    })
  }

  waitingForPlayersLabelTranslation() {
    return {
      ifthenelse: {
        if: [
          {
            comparison: {
              value1: "this.getLocale({playerId})",
              operator: "==",
              value2: "'ja'"
            }
          }
        ],
        then: [
          {
            commands: [
              "/sidebar {playerId} set 0 プレイヤーの参加を待っています"
            ]
          }
        ],
        else: [

        ]
      }
    }
  }

  onTimerBombExplosion(row, col) {
    if (this.game.sector.getFlameCount() <= 0) return

    if (!this.isFireAlarmTriggered) {
      this.isFireAlarmTriggered = true
      this.game.forEachPlayer((player) => {
        this.game.eventManager.emitEvent(player, "Alarm")
      })

      this.markExplosionCoord(row, col)

      this.game.addTimer({
        name: "PutOutFireTimer",
        duration: 30
      })
    }
  }

  markExplosionCoord(row, col) {
    this.eventHandler.explosionCoord = [row,col].join("-")
    this.eventHandler.explosionRow = row
    this.eventHandler.explosionCol = col
  }

  initFire(eventHandler) {
    eventHandler.addTrigger({
      event: "TimerBombExplosion",
      actions: [
        {
          function: "this.getMiniGame().onTimerBombExplosion({row}, {col})"
        }
      ]
    })

    eventHandler.addTrigger({
      event: "FlameRemoved",
      actions: [
        {
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "{this.getFlameCount()}",
                  operator: "==",
                  value2: "0"
                }
              }
            ],
            then: [
              {
                commands: [
                  "/event alarm_end"
                ]                
              },
              {
                timer: { 
                  name: "PutOutFireTimer",
                  shouldRemove: true
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
      event: "Timer:PutOutFireTimer:end",
      actions: [ 
        { 
          commands: [
            "/event alarm_end",
            "/scene play StationExplode camera:{this.explosionCoord} row:{this.explosionRow} col:{this.explosionCol}"
          ]
        }
      ]
    })

  }

  initMain(eventHandler) {
    eventHandler.addTrigger({
      event: "HealthFull",
      actions: [
        {
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "{entityType}",
                  operator: "==",
                  value2: Protocol.definition().BuildingType.PowerSwitch
                }
              }
            ],
            then: [
              {
                commands: [
                  "/effect set {entityId} smoke 0"
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
      event: "HealthFull",
      actions: [
        {
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "this.getHealth(3231)",
                  operator: "==",
                  value2: 200
                }
              },
              {
                and: {
                  comparison: {
                    value1: "this.getHealth(1981)",
                    operator: "==",
                    value2: 200
                  }
                }
              }
            ],
            then: [
              {
                function: "this.restoreFov()"
              },
              {
                commands: [
                  "/event fix_lights_end"
                ]
              },
              {
                timer: { 
                  name: "LightsLocationTimer",
                  shouldRemove: true
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
      event: "PlayerJoined",
      actions: [
        {
          commands: [
            "/clear {playerId}",
            "/setequipment armor {playerId} space_suit",
            "/sethealth {playerId} 100",
            "/sidebar {playerId} show",
            "/sidebar {playerId} set 0 Waiting for Players",
            "/sidebar {playerId} set 1 0/" + this.REQUIRED_PLAYER_COUNT,
            "/speed {playerId} 10"
          ]
        },
        {
          function: "this.assignSpaceSuitColor({playerId})"
        },
        {
          function: "this.updateTaskCompleted()"
        },
        this.waitingForPlayersLabelTranslation()
      ]
    })

    eventHandler.addTrigger({
      event: "PlayerDestroyed",
      actions: [
        {
          function: "this.spawnPlayerCorpse({playerId})"
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
                  value1: "{playerRole}",
                  operator: "==",
                  value2: "'imposter'"
                }
              }
            ],
            then: [
              {
                commands: [
                  "/role @r[health=!0,c=1] imposter",
                  "/give @a[role=imposter] assassins_knife",
                  "/sidebar @a[role=imposter] set 0 Role: §aImposter",
                  "/caption @a[role=imposter] title Role: Imposter"
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
      event: "ObjectiveCompleted",
      actions: [
        {
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "{name}",
                  operator: "==",
                  value2: "'repair_power_generator'"
                }
              }
            ],
            then: [
              {
                commands: [
                  "/effect set 6121 smoke 0"
                ]
              }
            ],
            else: [

            ],
          }
        }
      ]
    })

    eventHandler.addTrigger({
      event: "ObjectiveCompleted",
      actions: [
        {
          function: "this.updateTaskCompleted()"
        }
      ]
    })

    // if all objectives of crew completed
    eventHandler.addTrigger({
      event: "ObjectiveCompleted",
      actions: [
        {
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "this.getObjectivesCountForRole('crew')",
                  operator: "==",
                  value2: "this.getCompletedObjectivesCount('crew')"
                }
              }
            ],
            then: [
              {
                commands: [
                  "/caption @a title Crew Wins"
                ]
              },
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
      event: "Timer:RoundStartTimer:tick",
      actions: [ 
        { 
          commands: [
            "/caption title Round starting in {remaining}",
            "/caption @a[locale=ja] title ゲーム開始まで{remaining}秒"
          ]
        }
      ]
    })

    eventHandler.addTrigger({
      event: "Timer:RoundStartTimer:end",
      actions: [ 
        { 
          commands: [
            "/interact 1805 open",
            "/interact 286 open",
            "/setting isChatEnabled false",
            "/role @r[c=1] imposter",
            "/role @a[role=!imposter] crew",
            "/give @a radio",
            "/give @a[role=imposter] assassins_knife",
            "/give @a[role=imposter] timer_bomb",
            "/give @a lead_pipe",
            "/give @a fire_extinguisher",
            "/objectives assign @a[role=crew,c=1] slave_trader_poison_gas",
            "/objectives assign @a[role=imposter,c=1] plant_bomb",
            "/objectives assign @a[role=imposter,c=1] hack_lights",
            "/objectives assign @a[role=imposter,c=1] @rand",
            "/objectives assign @a[role=imposter,c=1] @rand",
            "/objectives assign @a[role=crew] @all",
            "/sidebar @a clear",
            "/sidebar @a[role=crew] set 0 Role: §aCrew",
            "/sidebar @a[role=crew,locale=ja] set 0 役職: §aクルー",
            "/caption @a[role=crew] title Role: Crew",
            "/caption @a[role=crew] subtitle Goal: Complete all tasks",
            "/sidebar @a[role=imposter] set 0 Role: §aImposter",
            "/sidebar @a[role=imposter,locale=ja] set 0 役職: §aスパイ",
            "/caption @a[role=imposter] title Role: Imposter",
            "/caption @a[role=imposter] subtitle Goal: Kill crew members"
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
          commands: [
            "/caption subtitle Game ending in {remaining}",
            "/caption @a[locale=ja] subtitle {remaining} 秒後にゲームが終了します。",
          ]
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
      event: "Timer:LightsLocationTimer:tick",
      actions: [ 
        { 
          commands: [
            "/map blink @b[type=PowerSwitch,health=!200]"
          ]
        }
      ]
    })

    eventHandler.addTrigger({
      event: "scene:StationExplode:end",
      actions: [
        {
          commands: [
            "/caption @a title Imposter Wins"
          ]
        },
        {
          timer: { 
            name: "RoundEndTimer",
            duration: 10
          }
        }
      ]
    })

    eventHandler.addTrigger({
      event: "scene:BurnImposter:end",
      actions: [
        {
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "this.getAlivePlayerCountForRole('imposter')",
                  operator: "==",
                  value2: "0"
                }
              }
            ],
            then: [
              {
                commands: [
                  "/caption @a title Crew Wins"
                ]
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
      ]
    })

    eventHandler.addTrigger({
      event: "scene:EjectImposter:end",
      actions: [
        {
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "this.getAlivePlayerCountForRole('imposter')",
                  operator: "==",
                  value2: "0"
                }
              }
            ],
            then: [
              {
                commands: [
                  "/caption @a title Crew Wins"
                ]
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
        this.getWinConditionAction(),
        this.getWaitingForPlayersAction()
      ]
    })

  }

  registerVoteEndedHandler(eventHandler) {
    eventHandler.addTrigger({
      event: "VoteEndedSkip",
      actions: [
        {
          commands: [
            "/kill corpse human",
            "/scene play VotingSkipped"
          ]
        }
      ]
    })

    eventHandler.addTrigger({
      event: "VoteEnded",
      actions: [
        {
          commands: [
            "/kill corpse human"
          ]
        },
        { 
          ifthenelse: {
            if: [
              {
                comparison: {
                  value1: "this.getRole({mostVoted})",
                  operator: "==",
                  value2: "'imposter'"
                }
              }
            ],
            then: [
              {
                ifthenelse: {
                  if: [
                    {
                      comparison: {
                        value1: "this.isChance(0.5)",
                        operator: "==",
                        value2: "true"
                      }
                    },
                  ],
                  then: [
                    {
                      commands: [
                        "/scene play EjectImposter votedPlayer:{mostVoted} not:"
                      ]
                    }
                  ],
                  else: [
                    {
                      commands: [
                        "/scene play BurnImposter votedPlayer:{mostVoted} not:"
                      ]
                    }
                  ]
                }
              }
            ],  
            else: [
              {
                ifthenelse: {
                  if: [
                    {
                      comparison: {
                        value1: "this.isChance(0.5)",
                        operator: "==",
                        value2: "true"
                      }
                    },
                  ],
                  then: [
                    {
                      commands: [
                        "/scene play EjectImposter votedPlayer:{mostVoted} not:not"
                      ]
                    }
                  ],
                  else: [
                    {
                      commands: [
                        "/scene play BurnImposter votedPlayer:{mostVoted} not:not"
                      ]
                    }
                  ]
                }
              }
            ]
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
            commands: ["/sidebar @a set 1 §a{this.getPlayerCount()}/" + this.REQUIRED_PLAYER_COUNT]
          }
        ],
        else: [

        ],
      }
    }
  }

  getWinConditionAction() {
    return {
      ifthenelse: {
        if: [
          {
            comparison: {
              value1: "this.getAlivePlayerCount()",
              operator: "==",
              value2: "2"
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
                value1: "this.getAlivePlayerCountForRole('imposter')",
                operator: "==",
                value2: "1"
              }
            }
          }
        ],
        then: [
          {
            commands: ["/caption @a title Imposter Wins"]
          },
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
  }


}

module.exports = FindTheImposter