const BoundingBox = () => {
}

BoundingBox.prototype = {
  getX() {
    throw new Error("must implement BoundingBox#getX")
  },

  getY() {
    throw new Error("must implement BoundingBox#getY")
  },

  getBoxWithRadius(radius) {
    return this.getBox(this.getX(), this.getY(), radius * 2, radius * 2)
  },

  getBox(x = this.getX(), y = this.getY(), w = this.getWidth(), h = this.getHeight()) {
    return {
      pos: {
        x: x - w/2,
        y: y - h/2,
      },
      w: w,
      h: h
    }
  },

  getNeighborBoundingBox(padding = 100) {
    return {
      minX: this.minX - padding,
      minY: this.minY - padding,
      maxX: this.maxX + padding,
      maxY: this.maxY + padding
    }

  },

  getBoundingBox() {
    return {
      minX: this.minX,
      minY: this.minY,
      maxX: this.maxX,
      maxY: this.maxY
    }
  },

  updateRbushCoords() {
    var box = this.getBox(this.getX(), this.getY())

    this.minX = box.pos.x,
    this.minY = box.pos.y,
    this.maxX = box.pos.x + box.w,
    this.maxY = box.pos.y + box.h
  }

}

module.exports = BoundingBox
