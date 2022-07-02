const Faithable = () => {
}

Faithable.prototype = {
  initFaithable(faith) {
    this.faith = faith || 0
  },

  setFaith(faith) {
    const prevFaith = this.faith

    if (faith > this.getMaxFaith()) {
      this.faith = this.getMaxFaith()
    } else if (faith < 0) {
      this.faith = 0
    } else {
      this.faith = faith
    }

    const delta = faith - prevFaith

    if (this.faith !== prevFaith) {
      if (delta < 0) {
        this.onFaithReduced() 
      } else if (delta > 0) {
        this.onFaithIncreased()
      }
      this.onFaithChanged()
    }
  },

  getMaxFaith() {
    return 100
  },

  onFaithChanged() {},
  onFaithIncreased() {},
  onFaithReduced() {}
}

module.exports = Faithable

