const Objective = require("./objective")
const Protocol = require('../../common/util/protocol')

class MiniGameObjectives {
  static init(sector) {
    this.objectives = {}
    this.initFeedSlime()
    this.initCollectOresFromMiningDrill()
    this.initMonkeyCage()
    this.initRepairPowerGenerator()
    this.initFuelTankPipe()
    this.initSolarPanelWire()
    this.initCookPizza()
    this.initKillSlaveTraderUsingPoisonGas()
    this.initResurrectTrader()
    this.initCleanDirtyFloor()
    this.initDisinfectMiasma()
    this.initRefillTurretAmmo()
    this.initButcherGuardCorpse()
    this.initConnectRailTrackToTram()
    this.initCookHotDog()
    this.initWaterCrops()
    this.initCollectBloodFromFloor()
    this.initCraftBloodPackAndHelpPatient()
    this.initFeedCustomerVodka()
    this.initFeedCustomerLectersDinner()
    this.initReviveSpider()
    this.initFeedPatientAntidote()
    this.initConnectLiquidPipeToOxygenGenerator()
    this.initHackLights()
    this.initPlantBomb()
    this.initAll(sector)
  }

  static initReviveSpider() {
    this.objectives["revive_spider"] = {
      description: "Biology: Revive Spider",
      description_ja: "生物学研究室: 蜘蛛を蘇生させろ",
      trigger: {
        event: 'CorpseRevived',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{corpseType}",
                    operator: "==",
                    value2: Protocol.definition().MobType.Spider
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete revive_spider"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }

  static initFeedPatientAntidote() {
    this.objectives["feed_patient_antidote"] = {
      description: "Medbay: Feed Patient-005 antidote",
      description_ja: "医務室: Patient-005に解毒薬を渡せ",
      onObjectiveAssigned: {
        commands: [
          "/give {objectivePlayerId} antidote 5"
        ]
      },
      trigger: {
        event: 'NeedSatisfied',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{entityId}",
                    operator: "==",
                    value2: 1184
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{actorId}",
                      operator: "==",
                      value2: "{objectivePlayerId}"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete feed_patient_antidote",
                    "/dialogue assign 1184 Im cured I think.."
                  ]
                },
                {
                  rawCommands: [
                    "/dialogue assign 1184 {\"locale\": \"ja\", \"text\": \"おかげさまで治ったと思います。\"}"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }

  static initPutOutFire(sector) {
    this.objectives["put_out_fire"] = {
      description: "Put out fire (50 seconds remaining)",
      trigger: {
        event: 'FlameRemoved',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{flameCount}",
                    operator: "==",
                    value2: 0
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete put_out_fire"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }

    this.initObjective(sector, "put_out_fire")
  }

  static initHackLights() {
    this.objectives["hack_lights"] = {
      description: "Security: Use Terminal to turn off lights",
      description_ja: "Security: コンピューターをハッキングして停電を起こせ",
      trigger: {
        event: "InteractBuilding",
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{entityType}",
                    operator: "==",
                    value2: "'Terminal'"
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "this.getRole({playerId})",
                      operator: "==",
                      value2: "'imposter'"
                    }
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{action}",
                      operator: "==",
                      value2: "'lights_off'"
                    }
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "this.getMiniGame().isLightHacked",
                      operator: "==",
                      value2: false
                    }
                  }
                }
              ],
              then: [
                {
                  function: "this.reduceFov()"
                },
                {
                  function: "this.getMiniGame().emitFixLights()"
                },
                {
                  function: "this.getMiniGame().setLightHacked(true)"
                },
                {
                  commands: [
                    "/sethealth @b[type=PowerSwitch] 100",
                    "/effect set @b[type=PowerSwitch] smoke 1",
                    "/objectives complete hack_lights"
                  ]
                },
                {
                  timer: {
                    name: "LightsLocationTimer",
                    duration: 90
                  }
                }
              ],  
              else: [
              ]
            }
          }
        ]
      }
    }
  }

  static initPlantBomb() {
    this.objectives["plant_bomb"] = {
      description: "Plant Timer Bomb anywhere",
      description_ja: "どこかに時限爆弾を設置しろ",
      trigger: {
        event: "BuildingPlaced",
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{entityType}",
                    operator: "==",
                    value2: "'TimerBomb'"
                  }
                }
              ],
              then: [
                {
                  commands: [
                    "/setowner {entityId} imposter",
                    "/objectives complete plant_bomb"
                  ]                
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }

  static initConnectLiquidPipeToOxygenGenerator() {
    this.objectives["connect_liquid_pipe_to_oxygen_generator"] = {
      description: "Oxygen Supply: Connect liquid pipe to oxygen generator",
      description_ja: "酸素供給室: 液体用タイプを酸素発生機に接続しろ",
      onObjectiveAssigned: {
        commands: [
          "/give {objectivePlayerId} liquid_pipe 99"
        ]
      },
      trigger: {
        event: 'BuildingResourceChanged',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{entityId}",
                    operator: "==",
                    value2: 2734
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{usage}",
                      operator: ">",
                      value2: "0"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete connect_liquid_pipe_to_oxygen_generator"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }

  static initButcherGuardCorpse() {
    this.objectives["butcher_guard_corpse"] = {
      description: "Prison: Take guard corpse and butcher it in kitchen",
      description_ja: "牢獄: 死体を回収してキッチンで解体しろ",
      trigger: {
        event: 'CorpseButchered',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{corpseType}",
                    operator: "==",
                    value2: Protocol.definition().MobType.Guard
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{entityId}",
                      operator: "==",
                      value2: "{objectivePlayerId}"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete butcher_guard_corpse"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }

  static initFeedCustomerLectersDinner() {
    this.objectives["feed_customer_lecters_dinner"] = {
      description: "Bar: Make lecters dinner at kitchen and give it to customer",
      description_ja: "バー: レクター流ディナーをキッチンで作って客に提供しろ",
      onObjectiveAssigned: {
        commands: [
          "/give {objectivePlayerId} human_meat 20"
        ]
      },
      trigger: {
        event: 'NeedSatisfied',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{entityId}",
                    operator: "==",
                    value2: 1060
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{actorId}",
                      operator: "==",
                      value2: "{objectivePlayerId}"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete feed_customer_lecters_dinner",
                    "/dialogue assign 1060 Why does it taste odd.."
                  ]
                },
                {
                  rawCommands: [
                    "/dialogue assign 1060 {\"locale\": \"ja\", \"text\": \"うえっ...なんだこの味...?\"}"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }


  static initFeedCustomerVodka() {
    this.objectives["feed_customer_vodka"] = {
      description: "Bar: Make vodka and give it to customer",
      description_ja: "バー: ウォッカを作って客に提供しろ",
      onObjectiveAssigned: {
        commands: [
          "/give {objectivePlayerId} bottle",
          "/give {objectivePlayerId} potato 5"
        ]
      },
      trigger: {
        event: 'NeedSatisfied',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{entityId}",
                    operator: "==",
                    value2: 1059
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{actorId}",
                      operator: "==",
                      value2: "{objectivePlayerId}"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete feed_customer_vodka",
                    "/dialogue assign 1059 spa-see-bo"
                  ]
                },
                {
                  rawCommands: [
                    "/dialogue assign 1059 {\"locale\": \"ja\", \"text\": \"くう〜効くなあ〜!\"}"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }

  static initCraftBloodPackAndHelpPatient() {
    this.objectives["craft_blood_pack_and_help_patient"] = {
      description: "Medbay: Feed Patient-001 a blood pack",
      description_ja: "医務室: Patient-001に血液パックを渡せ",
      onObjectiveAssigned: {
        commands: [
          "/give {objectivePlayerId} blood_pack 5"
        ]
      },
      trigger: {
        event: 'NeedSatisfied',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{entityId}",
                    operator: "==",
                    value2: 1051
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{actorId}",
                      operator: "==",
                      value2: "{objectivePlayerId}"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete craft_blood_pack_and_help_patient",
                    "/dialogue assign 1051 Thank you for saving me"
                  ]
                },
                {
                  rawCommands: [
                    "/dialogue assign 1051 {\"locale\": \"ja\", \"text\": \"助けてくれて本当にありがとう!\"}"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }


  static initCollectBloodFromFloor() {
    this.objectives["collect_blood_from_floor"] = {
      description: "Incinerator: Collect blood from floor until bottle is full",
      description_ja: "処刑室: 瓶がいっぱいになるまで床から血を集めろ",
      onObjectiveAssigned: {
        commands: [
          "/give {objectivePlayerId} bottle"
        ]
      },
      trigger: {
        event: 'EquipmentUsageChanged',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{itemType}",
                    operator: "==",
                    value2: Protocol.definition().BuildingType.BloodBottle
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{usage}",
                      operator: "==",
                      value2: 100
                    }
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{actorId}",
                      operator: "==",
                      value2: "{objectivePlayerId}"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete collect_blood_from_floor"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }


  static initCookHotDog() {
    this.objectives["cook_hotdog"] = {
      description: "Kitchen: Cook hot dog",
      description_ja: "キッチン: ホットドッグを作れ",
      onObjectiveAssigned: {
        commands: [
          "/give {objectivePlayerId} animal_meat 5",
          "/give {objectivePlayerId} wheat 5"
        ]
      },
      trigger: {
        event: 'FoodCooked',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{foodType}",
                    operator: "==",
                    value2: Protocol.definition().BuildingType.HotDog
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: `this.getInventoryItemCount({entityId},"HotDog")`,
                      operator: ">=",
                      value2: 1
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete cook_hotdog"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }


  static initConnectRailTrackToTram() {
    this.objectives["connect_rail_track_to_tram"] = {
      description: "Oxygen Supply: Connect Rail Stop to rail network",
      description_ja: "酸素供給室: 駅を線路に接続しろ",
      onObjectiveAssigned: {
        commands: [
          "/give {objectivePlayerId} rail_track 50"
        ]
      },
      trigger: {
        event: 'NetworkAssignmentChanged:Rail',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "this.getRailStopCount(3687)",
                    operator: ">",
                    value2: 1
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete connect_rail_track_to_tram"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }


  static initCollectOresFromMiningDrill() {
    this.objectives["collect_ores_from_drill"] = {
      description: "Armory: Collect Ores from Mining Drill",
      description_ja: "武器庫: 設置型ドリルから鉱石を回収しろ",
      trigger: {
        event: 'StoreItem',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{sourceStorageType}",
                    operator: "==",
                    value2: 107
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{actorId}",
                      operator: "==",
                      value2: "{objectivePlayerId}"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete collect_ores_from_drill"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }

  static initRefillTurretAmmo() {
    this.objectives["refill_turret_ammo"] = {
      description: "Armory: Refill Turret with Bullet Ammo",
      description_ja: "武器庫: タレットに弾丸を装填しろ",
      onObjectiveAssigned: {
        commands: [
          "/give {objectivePlayerId} bullet_ammo 99"
        ]
      },
      trigger: {
        event: 'StoreItem',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{destinationStorageId}",
                    operator: "==",
                    value2: 1386
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{actorId}",
                      operator: "==",
                      value2: "{objectivePlayerId}"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete refill_turret_ammo"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }


  static initWaterCrops() {
    this.objectives["water_crops"] = {
      description: "Garden: Plant seeds and water crops",
      description_ja: "農業エリア: 種を蒔き、作物に水をやれ",
      onObjectiveAssigned: {
        commands: [
          "/give {objectivePlayerId} water_bottle",
          "/give {objectivePlayerId} wheat_seed 4"
        ]
      },
      trigger: {
        event: 'CropWatered',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "this.isWatered(this.getSeedAt(41,38))",
                    operator: "==",
                    value2: true
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "this.isWatered(this.getSeedAt(41,39))",
                      operator: "==",
                      value2: true
                    }
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "this.isWatered(this.getSeedAt(42,38))",
                      operator: "==",
                      value2: true
                    }
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "this.isWatered(this.getSeedAt(42,39))",
                      operator: "==",
                      value2: true
                    }
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{actorId}",
                      operator: "==",
                      value2: "{objectivePlayerId}"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete water_crops"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }


  static initDisinfectMiasma() {
    this.objectives["disinfect_miasma"] = {
      description: "Prison: Disinfect miasma in corpses",
      description_ja: "牢獄: 死体から瘴気を除去しろ",
      onObjectiveAssigned: {
        commands: [
          "/give {objectivePlayerId} disinfectant"
        ]
      },
      trigger: {
        event: 'MiasmaDisinfected',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{entityType}",
                    operator: "==",
                    value2: Protocol.definition().MobType.Guard
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{actorId}",
                      operator: "==",
                      value2: "{objectivePlayerId}"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete disinfect_miasma"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }


  static initCleanDirtyFloor() {
    this.objectives["clean_dirty_floor"] = {
      description: "Dormitory: Clean Dirty floor near Room 6",
      description_ja: "寝室エリア: ルーム6付近の床を清掃しろ",
      onObjectiveAssigned: {
        commands: [
          "/give {objectivePlayerId} mop"
        ]
      },
      trigger: {
        event: 'PlatformCleaned',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "this.getChunkRegionAt(62,61).hasDirt()",
                    operator: "==",
                    value2: false
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{playerId}",
                      operator: "==",
                      value2: "{objectivePlayerId}"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete clean_dirty_floor"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }


  static initResurrectTrader() {
  }

  static initKillSlaveTraderUsingPoisonGas() {
    this.objectives["slave_trader_poison_gas"] = {
      description: "Prison: Kill slave trader using poison gas",
      description_ja: "牢獄: 奴隷商人を毒ガス爆弾を用いて殺害しろ",
      onObjectiveAssigned: {
        commands: [
          "/give {objectivePlayerId} poison_grenade 10"
        ]
      },
      trigger: {
        event: 'MobKilled',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{entityId}",
                    operator: "==",
                    value2: 1166
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete slave_trader_poison_gas"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }

  static initMonkeyFollow() {
    this.objectives["monkey_follow"] = {
      description: "Find Monkey-001 and make him follow you",
      trigger: {
        event: 'MobFollow',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{entityId}",
                    operator: "==",
                    value2: 143
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{actorId}",
                      operator: "==",
                      value2: "{objectivePlayerId}"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete monkey_follow"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }

  static initCookPizza() {
    this.objectives["cook_pizza"] = {
      description: "Kitchen: Cook VeganPizza",
      description_ja: "キッチン: ベジタリアンピザを作れ",
      onObjectiveAssigned: {
        commands: [
          "/give {objectivePlayerId} plant_fiber 10",
          "/give {objectivePlayerId} wheat 5"
        ]
      },
      trigger: {
        event: 'FoodCooked',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{foodType}",
                    operator: "==",
                    value2: Protocol.definition().BuildingType.VeganPizza
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{entityId}",
                      operator: "==",
                      value2: "{objectivePlayerId}"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete cook_pizza"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }

  static initSolarPanelWire() {
    this.objectives["solar_panel_wire"] = {
      description: "Oxygen Supply: Connect Wires to Solar Paner located outside",
      description_ja: "酸素供給室: ソーラーパネルに電線を接続しろ",
      onObjectiveAssigned: {
        commands: [
          "/give {objectivePlayerId} wire 50"
        ]
      },
      trigger: {
        event: 'IsPowerChanged',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{entityId}",
                    operator: "==",
                    value2: 4617
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{isPowered}",
                      operator: "==",
                      value2: "true"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete solar_panel_wire"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }

  static initFuelTankPipe() {
    this.objectives["fuel_tank_pipe"] = {
      description: "Engine: Connect Fuel pipes from Oil Refinery to Fuel Tank",
      description_ja: "エンジンルーム: 石油掘削・精製機と燃料タンクを燃料用パイプで接続しろ",
      onObjectiveAssigned: {
        commands: [
          "/give {objectivePlayerId} fuel_pipe 99"
        ]
      },
      trigger: {
        event: 'BuildingResourceChanged',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{entityId}",
                    operator: "==",
                    value2: 6619
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{usage}",
                      operator: ">",
                      value2: "0"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete fuel_tank_pipe"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }

  static initRepairPowerGenerator() {
    this.objectives["repair_power_generator"] = {
      description: "Engine: Repair Power generators",
      description_ja: "エンジンルーム: 燃料発電機を修理しろ",
      onObjectiveAssigned: {
        commands: [
          "/give {objectivePlayerId} wrench"
        ]
      },
      trigger: {
        event: 'BuildingRepaired',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{entityId}",
                    operator: "==",
                    value2: 6121
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{actorId}",
                      operator: "==",
                      value2: "{objectivePlayerId}"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete repair_power_generator"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }

  static initMonkeyCage() {
    this.objectives["monkey_cage"] = {
      description: "Biology: Find and Bring Monkey-001 to its cage",
      description_ja: "生物学研究室: Monkey-001を見つけて檻に戻せ",
      trigger: {
        event: 'RegionEnter',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{entityId}",
                    operator: "==",
                    value2: 143
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{region}",
                      operator: "==",
                      value2: "'monkey_cage'"
                    }
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "this.getFollowingId({entityId})",
                      operator: "==",
                      value2: "{objectivePlayerId}"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete monkey_cage"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }
  }

  static initFeedSlime() {
    this.objectives["feed_slime"] = {
      description: "Biology: Feed Slime-020 bread",
      description_ja: "生物学研究室: スライムにパンを食べさせろ",
      onObjectiveAssigned: {
        commands: [
          "/give {objectivePlayerId} bread 5"
        ]
      },
      trigger: {
        event: 'MobFeed',
        actions: [
          {
            ifthenelse: {
              if: [
                {
                  comparison: {
                    value1: "{entityType}",
                    operator: "==",
                    value2: "'Slime'"
                  }
                },
                {
                  and: {
                    comparison: {
                      value1: "{playerId}",
                      operator: "==",
                      value2: "{objectivePlayerId}"
                    }
                  }
                }
              ],
              then: [
                { 
                  commands: [ 
                    "/objectives complete feed_slime"
                  ]
                }
              ],
              else: [

              ]
            }
          }
        ]
      }
    }

  }

  static initAll(sector) {
    for (let name in this.objectives) {
      this.initObjective(sector, name)
    }
  }

  static initObjective(sector, name) {
    let data = this.objectives[name]
    data.name = name
    new Objective(sector, data)
  }

}

module.exports = MiniGameObjectives