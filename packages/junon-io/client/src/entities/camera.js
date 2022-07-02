class Camera {
  constructor() {
    this.position = {
      x: 0,
      y: 0
    }
  }

  getX() {
    return this.position.x
  }

  getY() {
    return this.position.y
  }
  
}

module.exports = Camera