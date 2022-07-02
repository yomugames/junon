const Poolable = () => {
}

Poolable.prototype = {
  reset() {
    throw new Error("must implement reset")
  }
}

module.exports = Poolable
