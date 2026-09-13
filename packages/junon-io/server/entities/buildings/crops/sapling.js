const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class Sapling extends BaseSeed {
  getConstantsTable() {
    return "Crops.Sapling"
  }

  getType() {
    return Protocol.definition().BuildingType.Sapling
  }

  onConstructionFinished() {
    super.onConstructionFinished()
    this.container.addProcessor(this)
  }

  unregister() {
    super.unregister()
    this.container.removeProcessor(this)
  }

  removeStorageItems() {
    this.forEachItem((item) => {
      item.remove()
    })
  }

  interact(user) {
    if (this.harvesting(user)) return
    let handItem = user.getActiveItem()
    const sporelingTypes = [
      Protocol.definition().BuildingType.RedSpore,
      Protocol.definition().BuildingType.BrownSpore,
      Protocol.definition().BuildingType.WhiteSpore,
      Protocol.definition().BuildingType.OrangeSpore,
      Protocol.definition().BuildingType.YellowSpore,
      Protocol.definition().BuildingType.GreenSpore,
      Protocol.definition().BuildingType.BlueSpore,
      Protocol.definition().BuildingType.PurpleSpore,
      Protocol.definition().BuildingType.PinkSpore,
      Protocol.definition().BuildingType.BlackSpore
    ]

    // sapling has spore
    let storedItem = this.get(0)
    if (storedItem) {
      user.showError("Sapling already has a spore")
      return
    }

    // sapling doesnt have spore
    if (handItem && sporelingTypes.includes(handItem.getType())) {
      if (this.isHarvestable) {
        this.sector.giveToStorage(this, handItem.type, 1)
        this.setBuildingContent(handItem.type.toString())
        handItem.consume()
        if (handItem.isDepleted()) {
          user.inventory.removeItem(handItem)
        }
        user.showError("Spore planted")
      } else {
        user.showError("Sapling is still growing")
      }
    } else if (this.isHarvestable) {
      user.showError("Spore required")
    }
  }

  executeTurn() {
      super.executeTurn()
      const storedItem = this.get(0)
      if (!storedItem) return
  
      const isTenSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 10) === 0
      if (!isTenSecondInterval) return

      const searchStartRow = this.getRow() - 4
      const searchStartCol = this.getCol() - 4
      this.nearbySoil = []

      for (let row = searchStartRow; row < searchStartRow + 8; row++) {
        for (let col = searchStartCol; col < searchStartCol + 8; col++) {
          const isSaplingTile = row >= this.getRow() - 1 && row <= this.getRow() &&
                             col >= this.getCol() - 1 && col <= this.getCol()
          if (isSaplingTile) continue

          const platform = this.container.platformMap.get(row, col)
          const isOccupied = this.container.distributionMap.get(row, col) ||
                             this.container.structureMap.get(row, col) ||
                             this.container.armorMap.get(row, col)
          if (platform && platform.hasCategory("soil") && !isOccupied) {
            this.nearbySoil.push(platform)
          }
        }
      }

      let spreadChance = this.getSpread()

      if (this.nearbySoil.length > 0 && Math.random() * 100 < spreadChance) {
        const soil = this.nearbySoil[Math.floor(Math.random() * this.nearbySoil.length)]
        const storedItemKlass = storedItem.getKlass(storedItem.type)
        let yieldName = storedItemKlass.prototype.getConstants().yield
        if (Math.random() < 0.005) {
          const nearbySaplings = this.searchSapling()
          if (nearbySaplings.length > 0) {
            const sapling = nearbySaplings[Math.floor(Math.random() * nearbySaplings.length)]
            const saplingStoredItem = sapling.get(0)
            if (saplingStoredItem) {
              if (saplingStoredItem.getType() !== storedItem.getType()) {
                const newSporeType = this.chooseSporeType(storedItem.getTypeName(), saplingStoredItem.getTypeName())
                if (newSporeType) {
                  const newSporeKlass = storedItem.getKlass(Protocol.definition().BuildingType[newSporeType])
                  yieldName = newSporeKlass.prototype.getConstants().yield
                }
              }
            }
          }
        }
        const cropType = Protocol.definition().BuildingType[yieldName]
        const crop = this.sector.placeBuilding({
          angle: -90,
          x: soil.getX(),
          y: soil.getY(),
          type: cropType,
          owner: this.getOwner()
        })
      }
  
      let decay = 1
      decay = decay * this.sector.buildSpeed

      this.setHealth(this.health - decay)
  }

  searchSapling() {
    const searchStartRow = this.getRow() - 4
    const searchStartCol = this.getCol() - 4
    this.nearbySapling = []

    for (let row = searchStartRow; row < searchStartRow + 8; row++) {
      for (let col = searchStartCol; col < searchStartCol + 8; col++) {
        const isSaplingTile = row >= this.getRow() - 1 && row <= this.getRow() &&
                            col >= this.getCol() - 1 && col <= this.getCol()
        if (isSaplingTile) continue

        const sapling = this.container.distributionMap.get(row, col)
        if (sapling && sapling.getType() === this.getType() && !this.nearbySapling.includes(sapling)) {
          this.nearbySapling.push(sapling)
        }
      }
    }
    return this.nearbySapling
  }

  chooseSporeType(parentOne, parentTwo) {
    const pair = [parentOne, parentTwo].sort().join(",")

    switch (pair) {
      case "BrownSpore,RedSpore":
        if (Math.random() < 0.8) {
          return "OrangeSpore"
        } else {
          return "YellowSpore"
        }

      case "RedSpore,WhiteSpore":
        return "PinkSpore"

      case "OrangeSpore,RedSpore":
        return "YellowSpore"

      case "RedSpore,YellowSpore":
        return "PinkSpore"

      case "GreenSpore,RedSpore":
        return "OrangeSpore"

      case "BlueSpore,RedSpore":
        return "PurpleSpore"

      case "PurpleSpore,RedSpore":
        return "YellowSpore"

      case "PinkSpore,RedSpore":
        return "OrangeSpore"

      case "BlackSpore,RedSpore":
        return "PurpleSpore"


      case "BrownSpore,WhiteSpore":
        return "GreenSpore"

      case "BrownSpore,OrangeSpore":
        return "YellowSpore"

      case "BrownSpore,YellowSpore":
        return "GreenSpore"

      case "BrownSpore,GreenSpore":
        return "OrangeSpore"

      case "BlueSpore,BrownSpore":
        return "PurpleSpore"

      case "BrownSpore,PurpleSpore":
        return "GreenSpore"

      case "BrownSpore,PinkSpore":
        return "YellowSpore"

      case "BlackSpore,BrownSpore":
        return "GreenSpore"


      case "OrangeSpore,WhiteSpore":
        return "PinkSpore"

      case "WhiteSpore,YellowSpore":
        return "GreenSpore"

      case "GreenSpore,WhiteSpore":
        return "YellowSpore"

      case "BlueSpore,WhiteSpore":
        return "PurpleSpore"

      case "PurpleSpore,WhiteSpore":
        return "PinkSpore"

      case "PinkSpore,WhiteSpore":
        return "YellowSpore"

      case "BlackSpore,WhiteSpore":
        return "BlueSpore"


      case "OrangeSpore,YellowSpore":
        return "PinkSpore"

      case "GreenSpore,OrangeSpore":
        return "BlueSpore"

      case "BlueSpore,OrangeSpore":
        return "PurpleSpore"

      case "OrangeSpore,PurpleSpore":
        return "PinkSpore"

      case "OrangeSpore,PinkSpore":
        return "YellowSpore"

      case "BlackSpore,OrangeSpore":
        return "PurpleSpore"


      case "GreenSpore,YellowSpore":
        return "OrangeSpore"

      case "BlueSpore,YellowSpore":
        return "PinkSpore"

      case "PurpleSpore,YellowSpore":
        return "GreenSpore"

      case "PinkSpore,YellowSpore":
        return "PurpleSpore"

      case "BlackSpore,YellowSpore":
        return "GreenSpore"


      case "BlueSpore,GreenSpore":
        return "YellowSpore"

      case "GreenSpore,PurpleSpore":
        return "PinkSpore"

      case "GreenSpore,PinkSpore":
        return "OrangeSpore"

      case "BlackSpore,GreenSpore":
        return "BlueSpore"


      case "BlueSpore,PurpleSpore":
        return "BlackSpore"

      case "BlueSpore,PinkSpore":
        return "PurpleSpore"

      case "BlackSpore,BlueSpore":
        return "PurpleSpore"


      case "PinkSpore,PurpleSpore":
        return "BlueSpore"

      case "BlackSpore,PurpleSpore":
        return "BlueSpore"


      case "BlackSpore,PinkSpore":
        return "PurpleSpore"
    }

    return null
  }

  harvesting(user) {
    let handItem = user.getActiveItem()
    const sporelingTypes = [
      Protocol.definition().BuildingType.RedSpore,
      Protocol.definition().BuildingType.BrownSpore,
      Protocol.definition().BuildingType.WhiteSpore,
      Protocol.definition().BuildingType.OrangeSpore,
      Protocol.definition().BuildingType.YellowSpore,
      Protocol.definition().BuildingType.GreenSpore,
      Protocol.definition().BuildingType.BlueSpore,
      Protocol.definition().BuildingType.PurpleSpore,
      Protocol.definition().BuildingType.PinkSpore,
      Protocol.definition().BuildingType.BlackSpore
    ]
    if (this.isHarvestable) {
      if (!(handItem && sporelingTypes.includes(handItem.getType()))) {
        this.harvest(user)
        return true
      }
    } else {
      if (handItem && handItem.isType("WaterBottle")) {
        this.water(user)
        handItem.instance.drain(10)
        return true
      }
    }
    return false
  }

  getSpread() {
    if (this.sector) {
      if (this.sector.entityCustomStats[this.id]) {
        return this.sector.entityCustomStats[this.id].spread
      }

      if (this.sector.buildingCustomStats[this.type]) {
        return this.sector.buildingCustomStats[this.type].spread
      }
    }

    return this.getStats(this.level).spread
  }

}

module.exports = Sapling
