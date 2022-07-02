class Camera {
  constructor() {
    this.position = [0,0]
  }

  getX() {
    return this.position[0]
  }

  getY() {
    return this.position[1]
  }

  toJson() {
    return {
      x: Math.floor(this.getX()),
      y: Math.floor(this.getY())
    }
  }
}

module.exports = Camera