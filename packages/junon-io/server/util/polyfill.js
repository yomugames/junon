Object.values = (items) => {
  return Object.keys(items).map((key) => {
      return items[key]
  })
} 

// https://stackoverflow.com/a/50993569
Object.defineProperty(Array.prototype, 'flat', {
    value: function(depth = 1) {
      return this.reduce(function (flat, toFlatten) {
        return flat.concat((Array.isArray(toFlatten) && (depth-1)) ? toFlatten.flat(depth-1) : toFlatten)
      }, [])
    }
})

