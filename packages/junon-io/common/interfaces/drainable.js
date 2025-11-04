function Drainable(usage, capacity, entity, resource) {
  this.entity = entity
  this.initDrainable(usage)
  this.initCapacity(capacity)
  this.resource = resource
}

Drainable.prototype = {
  initDrainable(initialUsage) {
    this.setContent(null)
    this.usage = initialUsage
    this.prevUsage = null
  },

  initCapacity(capacity) {
    this.capacity = capacity
  },

  getUsage() {
    return this.usage
  },

  isFull() {
    return this.getUsage() >= this.getUsageCapacity()
  },

  isEmpty() {
    return this.getUsage() <= 0
  },

  isDepleted() {
    return this.getUsage() <= 0
  },

  checkUsage() {
    if (isNaN(this.usage)) {
      this.usage = 0
    }

    if (this.usage < 0) this.usage = 0
    if (this.usage > this.getUsageCapacity()) this.usage = this.getUsageCapacity()

    if (this.usage === 0) {
      if (this.shouldSetEmptyContentOnZeroUsage()) {
        this.setContent(null)
      }
    }

    if (this.usage !== this.prevUsage) {
      this.onUsageChanged(this.resource, this.usage)
    }

    this.prevUsage = null
  },

  shouldSetEmptyContentOnZeroUsage() {
    return true
  },

  setUsage(usage) {
    if (isNaN(usage)) return
      
    const prevUsage = this.usage 

    if (usage < 0) usage = 0
    if (usage > this.getUsageCapacity()) usage = this.getUsageCapacity()

    this.usage = usage

    if (this.usage === 0) {
      if (this.shouldSetEmptyContentOnZeroUsage()) {
        this.setContent(null)
      }
    }

    if (this.usage !== prevUsage || this.usage === 0) {
      this.onUsageChanged(this.resource, this.usage)
    }
  },

  setContent(content) {
    if (this.content !== content) {
      this.content = content
      this.onContentChanged()
    }
  },

  isDrainable() {
    return true
  },

  getContent() {
    return this.content
  },

  drainDelayed(amount) {
    let amountDrained = this.usage < amount ? this.usage : amount

    if (this.prevUsage === null) {
      this.prevUsage = this.usage
    }
    
    this.usage = this.usage - amount

    this.onDrainableDelayed()

    return amountDrained
  },

  drain(amount) {
    let amountDrained = this.usage < amount ? this.usage : amount
    
    this.setUsage(this.usage - amount)

    return amountDrained
  },

  fillDelayed(content, amount) {
    this.setContent(content)

    if (this.prevUsage === null) {
      this.prevUsage = this.usage
    }

    let excess = (this.usage + amount - this.getUsageCapacity())
    if (excess < 0) excess = 0
      
    this.usage = this.usage + amount

    this.onDrainableDelayed()

    return excess
  },

  fill(content, amount) {
    this.setContent(content)

    let excess = (this.usage + amount - this.getUsageCapacity())
    if (excess < 0) excess = 0
      
    this.setUsage(this.usage + amount)

    return excess
  },

  setUsageChangedListener(listener) {
    this.usageChangeListener = listener
  },

  setDrainableDelayedListener(listener) {
    this.drainableDelayedListener = listener
  },

  onUsageChanged(resource, usage) {
    if (this.usageChangeListener) {
      this.usageChangeListener.onUsageChanged(resource, usage)
    }
  },

  onDrainableDelayed() {
    if (this.drainableDelayedListener) {
      this.drainableDelayedListener.onDrainableDelayed()
    }
  },

  onContentChanged() {

  },

  getUsageCapacity() {
    if (this.capacity) return this.capacity
      
    throw new Error("must implement Drainable#getUsageCapacity")
  }

}

module.exports = Drainable