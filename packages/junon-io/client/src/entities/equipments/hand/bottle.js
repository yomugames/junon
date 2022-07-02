const MeleeEquipment = require("./melee_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const ClientHelper = require("./../../../util/client_helper")

class Bottle extends MeleeEquipment {

  constructor(game, data) {
    super(game, data)

    if (this.content) {
      this.applyContentTint()
    }
  }

  repositionSprite() {
    this.sprite.position.x = 45
    this.sprite.position.y = 20
    this.sprite.rotation = 35 * Math.PI/180
  }

  getSprite() {
    let sprite = new PIXI.Container()
    sprite.name = "Bottle"

    this.bottleContent = new PIXI.Sprite(PIXI.utils.TextureCache["white.png"])
    this.bottleContent.name = "Content"
    this.bottleContent.alpha = 1
    this.bottleContent.width = 18
    this.bottleContent.height = 20
    this.bottleContent.position.x = 3
    this.bottleContent.position.y = 6
    this.bottleContent.alpha = 0
    sprite.addChild(this.bottleContent)

    let bottleContainer = new PIXI.Sprite(PIXI.utils.TextureCache[this.getSpritePath()])
    bottleContainer.name = "Container"
    sprite.addChild(bottleContainer)

    return sprite
  }

  onContentChanged() {
    if (this.content) {
      this.applyContentTint()
    } else {
      this.removeContentTint()
    }
  }

  applyContentTint() {
    let tint = ClientHelper.getTintForSample(this.content)
    this.bottleContent.tint = tint
    this.bottleContent.alpha = 1
  }

  removeContentTint() {
    this.bottleContent.tint = 0xffffff
    this.bottleContent.alpha = 0
  }

  getTypeName(content) {
    let name = super.getTypeName()

    if (content) {
      return content + " " + name
    } else {
      return name
    }
  }

  static getDescription(content) {
    if (content === "Water") {
      return i18n.t('WaterBottle.Description')
    } else {
      return super.getDescription()
    }
  }

  getSpritePath() {
    return 'bottle.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Bottle
  }

  getConstantsTable() {
    return "Equipments.Bottle"
  }

  getSVG(content) {
    const tint = content ? "#" + ClientHelper.getTintForSample(content).toString(16) : "none"

    return `
      <?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <svg id="svg2" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="76.631mm" width="63.517mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 225.06097 271.52799">
        <metadata id="metadata7">
         <rdf:RDF>
          <cc:Work rdf:about="">
           <dc:format>image/svg+xml</dc:format>
           <dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/>
           <dc:title/>
          </cc:Work>
         </rdf:RDF>
        </metadata>
        <g id="layer1" transform="translate(-251.63 -193.83)">
         <rect id="rect8070" ry="32.325" height="208.09" width="179.81" stroke="#000" y="247.27" x="274.76" stroke-width="20" fill="${tint}"/>
         <rect id="rect8072" ry="21.213" height="42.426" width="205.06" stroke="#000" y="203.83" x="261.63" stroke-width="20" fill="#6e583a"/>
         <rect id="rect8074" ry="12.627" height="98.995" width="25.254" y="284.65" x="400.05" fill="#fff"/>
        </g>
      </svg>
    `.trim()
  }

}

module.exports = Bottle
