const Constants = require("../constants.json")
const vec2 = require("./../util/vec2")

const Storable = () => {
}

Storable.prototype = {

  initStorable(length) {
    this.storageLength = length
    this.storage = {}
  },

  isStorable() {
    return true
  },

  isEquipmentStorage() {
    return false
  },

  clearStorage(options = {}) {
    let remainingCount = options.count

    this.getStorageItems().forEach((item) => {
      if (options.itemName) {
        if (item.getTypeName() === options.itemName) {
          if (options.count) {
            if (remainingCount > 0) {
              let countReduction = item.count
              item.reduceCount(remainingCount)
              remainingCount -= countReduction
            }
          } else {
            item.remove()
          }
        }
      } else {
        item.remove()
      }
    })
  },

  search(type) {
    let result

    for (let index in this.storage) {
      let item = this.storage[index]
      if(item && item.type === type) {
        result = item
        break
      }
    }

    return result
  },

  filter(type) {
    let result = []

    for (let index in this.storage) {
      let item = this.storage[index]
      if(item && item.type === type) {
        result.push(item)
      }
    }

    return result
  },

  getItemCount(type) {
    let count = 0

    for (let index in this.storage) {
      let item = this.storage[index]
      if(item && item.type === type) {
        count += item.count
      }
    }

    return count
  },

  searchByCondition(cond) {
    let result

    for (let index in this.storage) {
      let item = this.storage[index]
      if(item && cond(item)) {
        result = item
        break
      }
    }

    return result
  },

  hasItem(typeName) {
    let result

    for (let index in this.storage) {
      let item = this.storage[index]
      if(item && item.isType(typeName)) {
        result = item
        break
      }
    }

    return result
  },

  storeAt(index, item) {
    let previousItem = this.storage[index]

    const isSimilarType = this.storage[index] && this.storage[index].type === item.type
    if (isSimilarType) {
      let stackableIncrement = item.count
      const totalCount = this.storage[index].count + item.count
      if (totalCount > item.getMaxStack()) {
        stackableIncrement = item.count - (totalCount - item.getMaxStack())
      }
      
      item.count -= stackableIncrement
      this.increaseItemCount(index, stackableIncrement, previousItem)
    } else {
      this.storage[index] = item
      if (typeof item.setStorage !== 'function') {
      } else {
        item.setStorage(this, index)
      }

      this.storage[index].onStorageChanged(this)
      this.onStorageChanged(item, index, previousItem)
    }
  },

  increaseItemCount(index, count) {
    this.storage[index].count += count

    let item = this.storage[index]

    item.onStorageChanged(this)
    this.onStorageChanged(item, index, item)
  },

  getStorageItems() {
    let items = []
    this.forEachItem((item) => {
      items.push(item)
    })
    return items
  },

  getStorageLength() {
    return this.storageLength
  },

  store(item, startIndex = 0) {
    if (!item) return
    if (!item.type) return
      
    let index = this.getStackableSpaceIndex(item.type, startIndex)

    if (index >= 0) {
      const totalCount = this.storage[index].count + item.count
      let stackableIncrement = item.count
      if (totalCount > item.getMaxStack()) {
        stackableIncrement = item.count - (totalCount - item.getMaxStack())
      }

      item.count -= stackableIncrement

      this.increaseItemCount(index, stackableIncrement)

      if (item.count === 0) {
        item.remove() // as its been stacked
        return true
      }
    }

    index = this.getEmptySpaceIndex(startIndex)

    if (index >= 0) {
      this.storeAt(index, item)
      return true
    }

    return false // unable to store
  },

  onStoreFailure(item) {

  },

  // deletes item as well
  retrieve(index) {
    const item = this.storage[index]
    this.removeAt(index)
    return item
  },

  canStore(index, item) {
    return true
  },

  forEachItem(cb) {
    for (let index in this.storage) {
      if (this.storage[index]) {
        cb(this.storage[index])
      }
    }
  },

  removeAt(index) {
    if (this.storage[index]) {
      let item = this.storage[index]
      delete this.storage[index]

      item.setStorage(null, -1)
      item.onStorageChanged(this)
      this.onStorageChanged(item, index, item)
    }
  },

  canStoreAt(index) {
    return true
  },

  removeItem(item) {
    this.removeAt(this.findItemIndex(item))
  },

  findItemIndex(item) {
    let result

    for (let index in this.storage) {
      let stored = this.storage[index]
      if (stored === item) {
        result = parseInt(index)
        break
      }
    }

    return result
  },

  get(index) {
    return this.storage[index]
  },

  getStackableItem(type) {
    let stackableIndex = this.getStackableSpaceIndex(type)
    if (stackableIndex === -1) return null

    return this.storage[stackableIndex]
  },

  isFull(type) {
    if (typeof type !== "undefined") {
      let stackableIndex = this.getStackableSpaceIndex(type)
      if (stackableIndex >= 0) return false
    }

    return this.getEmptySpaceIndex() === -1
  },

  isEmpty() {
    return Object.keys(this.storage).length === 0
  },

  getStorageOccupancyCount() {
    return Object.keys(this.storage).length
  },

  isFullyStored() {
    return this.getStorageOccupancyCount() === this.getStorageLength()
  },

  getEmptySpaceCount() {
    return this.getStorageLength() - this.getStorageOccupancyCount()
  },

  getEmptySpaceIndex(startIndex = 0) {
    let result = -1

    for (var i = 0; i < this.storageLength; i++) {
      if (i < startIndex) continue

      if (!this.storage[i]) {
        result = i
        break
      }
    }

    return result
  },

  getStackableSpaceIndex(itemType, startIndex = 0) {
    let result = -1

    for (var i = 0; i < this.storageLength; i++) {
      if (i < startIndex) continue

      if (this.storage[i] ) {
        const isSimilarType = this.storage[i].type === itemType

        if (isSimilarType && this.storage[i].isStackableType() && !this.storage[i].isFullyStacked()) {
          result = i
          break
        }
      }
    }

    return result
  },

  onStorageChanged(item, index, previousItem) {

  }

}

module.exports = Storable
