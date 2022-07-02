const Helper = require('../../common/helper')

class Kit {
  constructor(game, name) {
    this.game = game
    this.name = name  
    this.items = {} // 0-7

    this.register()
  }

  addItem(item) {
  }

  createFromInventory(inventory) {
    let hotBarCount = 8
    for (var i = 0; i < hotBarCount; i++) {
      if (inventory.storage[i]) {
        let item = inventory.storage[i]
        this.items[i] = { type: item.type, count: item.count }
      }
    }

    return true
  }

  createFromKitData(kitData) {
    let hotBarCount = 8
    for (var i = 0; i < hotBarCount; i++) {
      let kitItem = kitData.items[i]
      if (kitItem) {
        this.items[i] = { type: kitItem.type, count: kitItem.count }
      }
    }
    
    return true
  }

  rename(name) {
    if (this.game.kits[name]) return

    this.unregister()
    this.name = name
    this.register()

    return true
  }

  giveToPlayer(player) {
    let hotBarCount = 8
    for (var i = 0; i < hotBarCount; i++) {
      let existingItem = player.inventory.storage[i]
      if (existingItem) {
        existingItem.remove()
      }

      let itemData = this.items[i]
      if (itemData) {
        let item = player.createItem(itemData.type, { count: itemData.count })
        player.inventory.storeAt(i, item)
      }
    }
  }

  prettyPrint() {
    let kitItems = Object.values(this.items).map((itemData) => {
      let itemName = Helper.getTypeNameById(itemData.type)
      return [itemName, itemData.count].join(":")
    }).join(" ")

    let rolesWithKit = []

    for (let teamId in this.game.teams) {
      let team = this.game.teams[teamId]
      team.forEachRole((role) => {
        if (role.kitName === this.name) {
          rolesWithKit.push(role.name)
        }
      })
    }

    let kitAssignments = "Assigned to roles: " + rolesWithKit.join(", ")

    return kitItems + "\n" + kitAssignments
  }

  register() {
    this.game.kits[this.name] = this
  }

  unregister() {
    delete this.game.kits[this.name]

    // remove kit from role
    for (let teamId in this.game.teams) {
      let team = this.game.teams[teamId]
      team.forEachRole((role) => {
        if (role.kitName === this.name) {
          role.resetKitName()
        }
      })
    }
  }

  remove() {
    this.unregister()
  }
}

module.exports = Kit