const BaseTerrain = require("./../base_terrain")
const Destroyable  = require("./../../../../../common/interfaces/destroyable")
const Helper = require("./../../../../../common/helper")

class BaseForeground extends BaseTerrain {
  getGroup() {
    return "foregrounds"
  }

  isForegroundTile() {
    return true
  }

  onBuildingConstructed() {
    super.onBuildingConstructed()

    this.initDestroyable()
  }

  syncWithServer(data) {
    super.syncWithServer(data)
    this.setHealth(data.health)
  }

  remove() {
    if (this.game.entityMenu.isOpen(this)) {
      this.game.entityMenu.close()
    }

    super.remove()
  }

  renderEntityMenu(entityMenu) {
    super.renderEntityMenu(entityMenu)
    this.showStats(entityMenu)
  }

  showStats(entityMenu) {
    let maxHealth = this.getMaxHealth()
    let health = this.health

    let el = ""
    const usage = "<div class='entity_stats_entry'>" +
                      "<div class='stats_type'>" + i18n.t('Remaining') + ":</div>" +
                      "<div class='stats_value'>" + health + "/" + maxHealth + "</div>" +
                  "</div>"
    el += usage

    entityMenu.querySelector(".entity_stats").innerHTML = el
  }

}

Object.assign(BaseForeground.prototype, Destroyable.prototype, {
  onHealthZero() {
  },
  onHealthIncreased(delta) {
  },
  onPostSetHealth() {
    if (this.game.entityMenu.isOpen(this)) {
      this.game.entityMenu.update(this)
    }
  },
  getMaxHealth() {
    return this.getConstants().health
  }

})


module.exports = BaseForeground
