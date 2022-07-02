const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const ClientHelper = require("./../../../util/client_helper")

class Syringe extends RangeEquipment {

  constructor(game, data) {
    super(game, data)

    this.applyContentTint()
  }

  applyContentTint() {
    let tint = ClientHelper.getTintForSample(this.content)
    this.sprite.tint = tint
  }

  getTypeName(content) {
    let name = super.getTypeName()

    if (content) {
      if (content === "PoisonSpider") {
        return "Poison " + name
      } else {
        return content + " blood " + name
      }
    } else {
      return name
    }
  }

  static getDescription(content) {
    let description = this.getConstants().description

    if (content) {
      switch (content) {
        case "Player":
          description = Constants.Player.syringeDescription
          break
        case "PoisonSpider":
          description = Constants.Mobs.PoisonSpider.syringeDescription
          break
        default:
          description = "Unknown sample"
      }
    }

    return description
  }

  static isUsable() {
    return false // not immediately usable. needs a target
  }

  getSpritePath() {
    return 'syringe.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Syringe
  }

  getConstantsTable() {
    return "Equipments.Syringe"
  }

  getSVG(content) {
    let tint = "#e5e5e5"

    if (content) {
      let tintValue = ClientHelper.getTintForSample(content)
      tint = ClientHelper.toHex(tintValue)
    }

    return `
      <svg id="svg2" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="92.148mm" width="54.025mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 191.42858 326.50859">
       <metadata id="metadata7">
        <rdf:RDF>
         <cc:Work rdf:about="">
          <dc:format>image/svg+xml</dc:format>
          <dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/>
          <dc:title/>
         </cc:Work>
        </rdf:RDF>
       </metadata>
       <g id="layer1" transform="translate(-204.29 -50.854)" stroke="#000" stroke-width="20">
        <path id="path8074" d="m298.57 353.08c-0.71428-12.143 0-101.43 0-101.43" fill="none"/>
        <rect id="rect8068" height="127.86" width="77.143" y="161.65" x="262.14" fill="${tint}"/>
        <rect id="rect8070" height="35" width="171.43" y="332.36" x="214.29" fill="${tint}"/>
        <path id="path8072" d="m298.57 152.36c-0.71428-12.143 0-101.43 0-101.43" fill="none"/>
       </g>
      </svg>
    `.trim()
  }

}

module.exports = Syringe
