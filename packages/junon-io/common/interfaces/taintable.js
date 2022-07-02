const Protocol = require('../util/protocol')
const Helper   = require('../helper')

// tiedly coupled to pressureNetwork..
const Taintable = () => {
}

Taintable.prototype = {
  initTaintable(options) {
  },

  getMaxEffectLevel() {
    return 4
  },

  getEffectsJson() {
    return this.effects
  },

  clean() {
    for (let effect in this.effects) {
      let value = this.effects[effect]
      if (value > 0) {
        this.setEffectLevel(effect, value - 1)
        break
      }
    }
  },

  getTotalEffectValue() {
    if (typeof this.effects === "undefined") return 0

    return Object.values(this.effects).reduce((sum, value) => { return sum + value }, 0)
  },

  setEffectLevel(effect, level) {
    const prevEffectLevel = this.getEffectLevel(effect)

    if (typeof this.effects === "undefined") {
      this.effects = {}
    }

    if (level < 0) {
      this.effects[effect] = 0
    } else if (level > this.getMaxEffectLevel()) {
      this.effects[effect] = this.getMaxEffectLevel()
    } else {
      this.effects[effect] = level
    }

    if (this.effects[effect] !== prevEffectLevel) {
      if (this.effects[effect] === 0) {
        this.unsetEffectCreatedAt(effect)
        this.onEffectRemoved(effect)
      } else if (!prevEffectLevel) {
        this.setEffectCreatedAt(effect, this.sector.game.timestamp)
        this.onEffectAdded(effect)
      }

      this.onEffectLevelChanged(effect, level)
    }

  },

  setEffectCreatedAt(effect, timestamp) {
    this.initEffectCreatedAt()
    this.effectCreatedAt[effect] = timestamp
  },

  unsetEffectCreatedAt(effect) {
    this.initEffectCreatedAt()
    delete this.effectCreatedAt[effect]
  },

  initEffectCreatedAt() {
    if (typeof this.effectCreatedAt === "undefined") {
      this.effectCreatedAt = {}
    }
  },

  getEffectCreatedAt(effect) {
    this.initEffectCreatedAt()

    return this.effectCreatedAt[effect] 
  },

  isMaxEffectLevelReached(effect) {
    return this.getEffectLevel(effect) >= this.getMaxEffectLevel()
  },

  getEffectLevel(effect) {
    if (typeof this.effects === "undefined") return 0

    return this.effects[effect] || 0
  },

  addWeb() {
    this.setEffectLevel("web", 1)
  },

  removeWeb() {
    this.setEffectLevel("web", 0)
  },

  addParalyze() {
    this.setEffectLevel("paralyze", 1)
  },

  removeParalyze() {
    this.setEffectLevel("paralyze", 0)
  },

  addPoison() {
    this.setEffectLevel("poison", 1)
  },

  removePoision() {
    this.setEffectLevel("poison", 0)
  },

  addRage() {
    this.setEffectLevel("rage", 1)
  },

  removeRage() {
    this.setEffectLevel("rage", 0)
  },

  addFear() {
    this.setEffectLevel("fear", 1)
  },

  removeFear() {
    this.setEffectLevel("fear", 0)
  },

  addInvisible() {
    this.setEffectLevel("invisible", 1)
  },

  removeInvisible() {
    this.setEffectLevel("invisible", 0)
  },

  addHaste() {
    this.setEffectLevel("haste", 1)
  },

  removeHaste() {
    this.setEffectLevel("haste", 0)
  },

  addDrunk() {
    this.setEffectLevel("drunk", 1)
  },

  removeDrunk() {
    this.setEffectLevel("drunk", 0)
  },

  addMiasma() {
    this.setEffectLevel("miasma", 1)
  },

  removeMiasma() {
    this.setEffectLevel("miasma", 0)
  },

  addSpin() {
    this.setEffectLevel("spin", 1)
  },

  removeSpin() {
    this.setEffectLevel("spin", 0)
  },

  addSmoke() {
    this.setEffectLevel("smoke", 1)
  },

  removeSmoke() {
    this.setEffectLevel("smoke", 0)
  },

  addDirt() {
    this.setEffectLevel("dirt", this.getEffectLevel("dirt") + 1)
  },

  reduceDirt() {
    this.setEffectLevel("dirt", this.getEffectLevel("dirt") - 1)
  },

  getDirtLevel() {
    return this.getEffectLevel("dirt")
  },

  hasBlood() {
    return this.hasEffect("blood")
  },

  removeDirt() {
    this.setEffectLevel("dirt", 0)
  },

  hasDirt() {
    return this.hasEffect("dirt")
  },

  hasEffect(effectName) {
    return this.getEffectLevel(effectName)
  },

  canAddEffect(effectName) {
    return true
  },

  addEffect(effectName) {
    if (effectName === 'poison') return this.addPoison()
    if (effectName === 'fire') return this.addFire()
    if (effectName === 'drunk') return this.addDrunk()
    if (effectName === 'fear') return this.addFear()
    if (effectName === 'paralyze') return this.addParalyze()
    if (effectName === 'miasma') return this.addMiasma()
    if (effectName === 'spin') return this.addSpin()
    if (effectName === 'smoke') return this.addSmoke()
    if (effectName === 'rage') return this.addRage()
    if (effectName === 'invisible') return this.addInvisible()
    if (effectName === 'haste') return this.addHaste()
  },

  addFire(level, options = {}) {
    if (!options.forceFlamable) {
      if (!this.isFlamable()) return
    }

    let fireLevel = level || this.getEffectLevel("fire") + 1
    this.setEffectLevel("fire", fireLevel)
  },

  reduceFire() {
    this.setEffectLevel("fire", this.getEffectLevel("fire") - 1)
  },

  removeFire() {
    this.setEffectLevel("fire", 0)
  },

  removeEffect(effectName) {
    if (!this.effects) return
      
    delete this.effects[effectName]
    this.onEffectRemoved(effectName)
  },

  removeAllEffects() {
    if (typeof this.effects === "undefined") return

    for (let effectName in this.effects) {
      this.removeEffect(effectName)
    }
  },

  isFlamable() {
    return this.getConstants().isFlamable || false
  },

  isInvisible() {
    return this.hasEffect("invisible")
  },

  isOnFire() {
    return this.getEffectLevel("fire") > 0
  },

  onEffectRemoved(effect) {},
  onEffectAdded(effect) {},
  onEffectLevelChanged(effect, level) {}
}

module.exports = Taintable

