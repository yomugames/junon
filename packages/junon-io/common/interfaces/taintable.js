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

  setEffectLevel(effect, level, duration) {
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
        this.unsetEffectDuration(effect)
        this.unsetEffectCreatedAt(effect)
        this.onEffectRemoved(effect)
      } else if (!prevEffectLevel) {
        if (typeof duration !== 'undefined') {
          this.setEffectDuration(effect, duration)
        }
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

  setEffectDuration(effect, duration) {
    this.initEffectDuration()
    this.effectDuration[effect] = duration
  },

  unsetEffectDuration(effect) {
    this.initEffectDuration()
    delete this.effectDuration[effect]
  },

  initEffectDuration() {
    if (typeof this.effectDuration === "undefined") {
      this.defaultEffectDuration = {
        web: 2,
        paralyze: 5,
        poison: 20,
        fear: 15,
        miasma: 60,
        spin: 4,
        drunk: 60,
        invisible: 30,
        haste: 15,
        rage: 60,
        smoke: Infinity,
        fire: 2,
      }
      this.effectDuration = {}      
    }
  },

  getEffectDuration(effect) {
    this.initEffectDuration()

    return this.effectDuration[effect] || this.defaultEffectDuration[effect]
  },

  isMaxEffectLevelReached(effect) {
    return this.getEffectLevel(effect) >= this.getMaxEffectLevel()
  },

  getEffectLevel(effect) {
    if (typeof this.effects === "undefined") return 0

    return this.effects[effect] || 0
  },

  addWeb(customduration) {
    this.setEffectLevel("web", 1, customduration)
  },

  removeWeb() {
    this.setEffectLevel("web", 0)
  },

  addParalyze(customduration) {
    this.setEffectLevel("paralyze", 1, customduration)
  },

  removeParalyze() {
    this.setEffectLevel("paralyze", 0)
  },

  addPoison(customduration) {
    this.setEffectLevel("poison", 1, customduration)
  },

  removePoision() {
    this.setEffectLevel("poison", 0)
  },

  addRage(customduration) {
    this.setEffectLevel("rage", 1, customduration)
  },

  removeRage() {
    this.setEffectLevel("rage", 0)
  },

  addFear(customduration) {
    this.setEffectLevel("fear", 1, customduration)
  },

  removeFear() {
    this.setEffectLevel("fear", 0)
  },

  addInvisible(customduration) {
    this.setEffectLevel("invisible", 1, customduration)
  },

  removeInvisible() {
    this.setEffectLevel("invisible", 0)
  },

  addHaste(customduration) {
    this.setEffectLevel("haste", 1, customduration)
  },

  removeHaste() {
    this.setEffectLevel("haste", 0)
  },

  addDrunk(customduration) {
    this.setEffectLevel("drunk", 1, customduration)
  },

  removeDrunk() {
    this.setEffectLevel("drunk", 0)
  },

  addMiasma(customduration) {
    this.setEffectLevel("miasma", 1, customduration)
  },

  removeMiasma() {
    this.setEffectLevel("miasma", 0)
  },

  addSpin(customduration) {
    this.setEffectLevel("spin", 1, customduration)
  },

  removeSpin() {
    this.setEffectLevel("spin", 0)
  },

  addSmoke(customduration) {
    this.setEffectLevel("smoke", 1, customduration)
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

  setDirt(lvl) {
    this.setEffectLevel("dirt", Math.max(Math.min(parseInt(lvl),4),0))
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

  addEffect(effectName, customduration) {
    if (effectName === 'poison') return this.addPoison(customduration)
    if (effectName === 'fire') return this.addFire(undefined, {forceFlamable: true}, customduration)
    if (effectName === 'drunk') return this.addDrunk(customduration)
    if (effectName === 'fear') return this.addFear(customduration)
    if (effectName === 'paralyze') return this.addParalyze(customduration)
    if (effectName === 'miasma') return this.addMiasma(customduration)
    if (effectName === 'spin') return this.addSpin(customduration)
    if (effectName === 'smoke') return this.addSmoke(customduration)
    if (effectName === 'rage') return this.addRage(customduration)
    if (effectName === 'invisible') return this.addInvisible(customduration)
    if (effectName === 'haste') return this.addHaste(customduration)
  },

  addFire(level, options = {}, customduration) {
    if (!options.forceFlamable) {
      if (!this.isFlamable()) return
    }

    let fireLevel = level || this.getEffectLevel("fire") + 1
    this.setEffectLevel("fire", fireLevel, customduration)
  },

  reduceFire() {
    this.setEffectLevel("fire", this.getEffectLevel("fire") - 1)
  },

  removeFire() {
    this.setEffectLevel("fire", 0)
  },

  removeEffect(effectName) {
    if (!this.effects) return
    this.setEffectLevel(effectName, 0)
      
    // delete this.effects[effectName]
    // this.onEffectRemoved(effectName)
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
