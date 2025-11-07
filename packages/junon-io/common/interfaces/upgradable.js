const Upgradable = () => {
}

Upgradable.prototype = {
  getConstantsTable() {
    throw new Error(this.constructor.name + " must implement getConstantsTable")
  },

  hasArithmeticProgressionUpgrades() {
    return true
  },

  arithmeticSum(count, first, last) {
    return  count * (first + last) / 2
  },

  getUpgradeProgress(level = this.level) {
    const progress = {}
    let curr, next

    if (typeof level === "undefined") {
      curr = this.getStats(0)
      for (let key in curr) {
        progress[key] = { before: curr[key] }
      }
    } else {
      curr = this.getStats(level)
      next = this.getStats(level + 1)

      for (let key in next) {
        progress[key] = { before: curr[key], after: next[key]  }
      }
    }

    return progress
  }



}

module.exports = Upgradable
