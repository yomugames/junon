class EntityGroup {
  constructor(sector) {
    this.children = {}
    this.leader = null
  }

  addChild(child) {
    this.children[child.id] = child
    child.setEntityGroup(this)

    if (!this.leader) {
      this.setLeader(child)   
    }
  }

  isLeader(child) {
    return this.leader === child
  }

  setLeader(child) {
    this.leader = child
  }

  findNewLeader() {
    let childrenList = Object.keys(this.children)
    let randomIndex = Math.floor(Math.random() * childrenList.length)
    let randomKey = childrenList[randomIndex]
    let newLeader = this.children[randomKey]
    this.setLeader(newLeader)
  }

  setDesiredAttackTarget(attackTarget) {
    this.desiredAttackTarget = attackTarget

    this.forEachChildren((child) => {
      if (!this.isLeader(child)) { // dont include leader. avoid infinite loop
        child.setDesiredAttackTarget(attackTarget)
      }
    })
  }

  getDesiredAttackTarget() {
    if (this.desiredAttackTarget ) {
      if (this.desiredAttackTarget.isDestroyed() || this.desiredAttackTarget.isRemoved) {
        this.desiredAttackTarget = null
      }
    }

    return this.desiredAttackTarget
  }

  removeChild(child) {
    delete this.children[child.id]

    if (this.leader === child) {
      this.findNewLeader()
    }
  }

  getChildCount() {
    return Object.keys(this.children).length
  }

  addGoalTarget(entity, options = {}) {
    for (let id in this.children) {
      this.children[id].addGoalTarget(entity, options)
    }
  }

  setAttraction(attraction) {
    for (let id in this.children) {
      this.children[id].setAttraction(attraction)
    }
  }

  forEachChildren(cb) {
    for (let id in this.children) {
      let entity = this.children[id]
      cb(entity)
    }
  }

  remove() {
    for (let id in this.children) {
      let entity = this.children[id]
      entity.remove()
    }
  }

  setGoalTargetRemovedListener(listener) {
    this.onGoalTargetRemovedListener = listener
  }

  onGoalTargetRemoved() {
    if (this.onGoalTargetRemovedListener) {
      this.onGoalTargetRemovedListener()
    }
  }

}

module.exports = EntityGroup
