const Constants = require("./../../../common/constants.json")

class Selection {
  
  constructor(container) {
    this.container = container

    this.graphics = this.sprite = this.getSprite()
    this.getSpriteContainer().addChild(this.sprite)

    this.padding = 2

    // can change depending on selected entity
    this.width  = Constants.tileSize 
    this.height = Constants.tileSize 
  }

  getSprite() {
    const graphics = new PIXI.Graphics()
    graphics.name = "Selection"

    return graphics
  }

  isShown() {
    return this.graphics.width > 0
  }

  getSpriteContainer() {
    return this.container.effectsContainer
  }

  draw() {
    const lineStyle = this.getSelectionLineStyle()
    let shape = this.getSelectionShape(this.selectedEntity)

    this.graphics.lineStyle(lineStyle.lineWidth, lineStyle.color)

    let selectionRect = this.selectedEntity.getSelectionRect()

    if (selectionRect) {
      this.graphics.drawRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h)
    } else if (shape === "rectangle") {
      this.graphics.drawRect(-this.width/2 + this.padding, -this.height/2 + this.padding, this.width - (this.padding * 2), this.height - (this.padding * 2))
    } else {
      this.graphics.drawCircle(0, 0, this.width / 2)
    }

    this.graphics.endFill()
  }

  getSelectionLineStyle() {
    return {
      lineWidth: 4,
      color: 0xeeeeee,
      alpha: 0.7
    }
  }

  clear() {
    this.graphics.clear()
  }

  shouldAttachToSprite(entity) {
    return entity.isMovingEntity() || entity.isCorpse()
  }

  onSelectionRemoved(entity) {
    this.container.onSelectionRemoved(entity)
  }

  onSelectionChanged(entity) {
    this.container.onSelectionChanged(entity)
  }

  highlight(entity) {
    let isAlreadySelected = this.selectedEntity === entity
    if (isAlreadySelected) return

    this.clear()

    if (this.selectedEntity) {
      this.onSelectionRemoved(this.selectedEntity)
    }

    this.selectedEntity = entity

    this.onSelectionChanged(this.selectedEntity)

    if (this.shouldAttachToSprite(entity)) {
      // attach sprite to entity
      this.attachToSprite(entity)
      this.reposition(0,0)
    } else {
      this.attachToSector()
      this.reposition(entity.getRelativeX(), entity.getRelativeY())
    }

    this.resize(entity.getSelectionWidth(), entity.getSelectionHeight())
    this.draw()

    this.selectedEntity.onHighlighted()
  }

  attachToSprite(entity) {
    if (this.graphics.parent) {
      this.graphics.parent.removeChild(this.graphics)
    }
    
    entity.sprite.addChild(this.graphics)
  }

  attachToSector() {
    // possible that parent is null. entity removed due to death
    if (this.graphics.parent) {
      this.graphics.parent.removeChild(this.graphics)
    }
    this.getSpriteContainer().addChild(this.graphics)
  }

  unhighlight(entity) {
    if (this.selectedEntity === entity) {
      this.clear()
      this.onSelectionRemoved(this.selectedEntity)
      this.selectedEntity = null
    }
  }

  getSelectionShape(entity) {
    if (this.shouldAttachToSprite(entity)) {
      return "circle"
    } else {
      return "rectangle"
    }
  }

  resize(w, h) {
    this.width = w
    this.height = h
  }

  reposition(x, y) {
    this.graphics.position.set(x, y)
  }
}

module.exports = Selection