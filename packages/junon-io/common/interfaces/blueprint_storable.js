const Storable = require("./storable")

const BlueprintStorable = () => {
}

BlueprintStorable.prototype = {
  postStorageChanged() {
    // callback
  }
}

Object.assign(BlueprintStorable.prototype, Storable.prototype, {
  onStorageChanged() {
    this.postStorageChanged()
  }
})

module.exports = BlueprintStorable

