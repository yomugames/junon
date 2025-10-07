const BitmapText = require("./bitmap_text")

let cachedPIXIText = {}

module.exports = {
  httpRequest(url, cb) {
    var xhttp = new XMLHttpRequest()
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
         cb.success(xhttp.responseText)
      }
    }
    xhttp.onerror = cb.error
    xhttp.open("GET", url, true)
    xhttp.send()

    return xhttp
  },
  escapeHTML(str) {
    return str.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;')
             .replace(/'/g, '&#039;');
  },
  httpPost(url, body, cb) {
    var xhttp = new XMLHttpRequest()
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
         cb.success(xhttp.responseText)
      }
    }

    xhttp.onerror = cb.error

    xhttp.open("POST", url)
    xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8")
    xhttp.send(JSON.stringify(body))

    return xhttp
  },
  getKeycode(event) {
    // similar to jquery
    if (event.which == null) {
      return event.charCode != null ? event.charCode : event.keyCode
    }
    
    return event.which
  },
  removeSelfAndChildrens(sprite) {
    if (!sprite) return

    while(sprite.children[0]) {
      this.removeSelfAndChildrens(sprite.children[0])
    }

    if (sprite.parent) {
      sprite.parent.removeChild(sprite)
    }
  },

  toHex(number) {
    return "#" + (number + 0x1000000).toString(16).substring(1)
  },

  hexToInt(hex) {
    return parseInt(hex.replace("#", ""), 16)
  },

  getTintForSample(sample) {
    let tint = 0xffffff

    switch (sample) {
      case "Player":
        tint = 0xff0000
        break
      case "Alien":
        tint = 0x0000ff
        break
      case "Spider":
        tint = 0x444444
        break
      case "PoisonSpider":
        tint = 0x044304
        break
      case "Water":
        tint = 0x2F5399
        break
      case "Blood":
        tint = 0x840309
        break
      default:
        // nothing
    }

    return tint
  },

  animateExplosion(x, y, options = {}) {
    let spritePath = options.spritePath || "circle.png"
    let minWidth = options.minWidth || 10
    let maxWidth = options.maxWidth || 100
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache[spritePath])
    sprite.anchor.set(0.5)
    sprite.position.x = x
    sprite.position.y = y

    if (options.tint) {
      sprite.tint = options.tint
    }
    
    game.sector.effectsContainer.addChild(sprite)

    let width = { width: minWidth }

    var tween = new TWEEN.Tween(width)
        .to({ width: maxWidth }, 200)
        .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
        .onUpdate(() => {
          sprite.width = width.width
          sprite.height = width.width
        })
        .onComplete(() => {
          game.sector.effectsContainer.removeChild(sprite)
        })
        .start()
  },


  animateMineralIncreased(x, y, amount, name) {
    const duration = 1000
    const yLength  = 100

    let text = "+" + amount + " " + name

    if (!cachedPIXIText[text]) {
      let style = { fontFamily : 'Arial', fontSize: 16, fill : 0xffffff, align : 'center', strokeThickness: 5, miterLimit: 3 }
      let pixiText = new PIXI.Text(text, style)
      cachedPIXIText[text] = pixiText 
    }

    let sprite = cachedPIXIText[text]

    game.sector.effectsContainer.addChild(sprite)

    let position = {
      x: x,
      y: y
    }

    sprite.visible = true
    sprite.position.set(position.x, position.y)

    new TWEEN.Tween(position)
        .to({ x: position.x, y: position.y - yLength }, duration)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          sprite.position.y = position.y
        })
        .onComplete(() => {
          sprite.visible = false
        })
        .start()
  },

  addTrail(x, y, angle, color, radius, offset, isExpanding, spritePath, spriteContainer) {
    spriteContainer = spriteContainer || game.sector.effectsContainer
    spritePath = spritePath || "white_smoke.png"
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache[spritePath])
    sprite.anchor.set(0.5)

    const distanceFromThurster = 96

    const randomWidth = Math.floor(Math.random() * radius) + 10
    sprite.width = randomWidth
    sprite.height = randomWidth
    sprite.tint = color
    sprite.position.x = x - offset * Math.cos(angle)
    sprite.position.y = y - offset * Math.sin(angle) // opposite y direction

    spriteContainer.addChild(sprite)

    let alpha = { alpha: 1 }
    let maxExpansion = 32
    let origWidth = sprite.width

    var tween = new TWEEN.Tween(alpha)
        .to({ alpha: 0 }, 1500)
        .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
        .onUpdate(() => {
          sprite.alpha = alpha.alpha
          if (isExpanding) {
            let delta = maxExpansion - alpha.alpha * maxExpansion
            sprite.width  = origWidth + delta
            sprite.height = origWidth + delta
          }
        })
        .onComplete(() => {
          spriteContainer.removeChild(sprite)
        })
        .start()
  },

  addSmoke(x, y, color = 0x999999, minWidth = 20, maxWidth = 50, shouldRandomizeDistance) {
    let data = this.getSmokeTween(x, y, color, minWidth, maxWidth, shouldRandomizeDistance)

    data.tween.start()

    return data
  },

  addBulletTrail(x, y, angle, color, width) {
    this.getBulletTrailTween(x, y, angle, color, width).start()
  },

  // https://stackoverflow.com/a/16360660
  getRandomColorInRange(startColor, endColor, ratio, options = {}) {
    startColor = startColor.replace("#", "")
    endColor   = endColor.replace("#", "")

    let r = Math.ceil(parseInt(startColor.substring(0,2), 16) * ratio + parseInt(endColor.substring(0,2), 16) * (1-ratio))
    let g = Math.ceil(parseInt(startColor.substring(2,4), 16) * ratio + parseInt(endColor.substring(2,4), 16) * (1-ratio))
    let b = Math.ceil(parseInt(startColor.substring(4,6), 16) * ratio + parseInt(endColor.substring(4,6), 16) * (1-ratio))

    const randomColor = this.hex(r) + this.hex(g) + this.hex(b)
    return options.shouldReturnInteger ? parseInt(randomColor, 16) : randomColor
  },

  // colors - [{ hex: '#00ff00', ratio: 0.2 }]
  mixColors(colors) {
    let r = 0
    let g = 0
    let b = 0

    colors.forEach((color) => {
      let hexValue = color.hex.replace("#", "")
      r += Math.ceil(parseInt(hexValue.substring(0,2), 16) * color.ratio)
      g += Math.ceil(parseInt(hexValue.substring(2,4), 16) * color.ratio)
      b += Math.ceil(parseInt(hexValue.substring(4,6), 16) * color.ratio)
    })

    r = Math.min(255, r)
    g = Math.min(255, g)
    b = Math.min(255, b)

    return [r, g, b]
  },

  hex(x) {
    x = x.toString(16);
    return (x.length == 1) ? '0' + x : x
  },

  getGasTween(sprite, x, y, color = 0x999999, minWidth = 20, maxWidth = 50, onComplete) {
    sprite.anchor.set(0.5)

    const randomWidth = Math.floor(Math.random() * (maxWidth - minWidth)) + minWidth
    sprite.alpha = 0.1
    sprite.width = randomWidth
    sprite.height = randomWidth
    sprite.tint = color
    sprite.position.x = x
    sprite.position.y = y

    let prop = { alpha: 0.1, width: randomWidth }

    let expand = new TWEEN.Tween(prop)
        .to({ alpha: 0.9, width: prop.width + 64 }, 3000)
        .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
        .onUpdate(() => {
          sprite.alpha = prop.alpha
          sprite.width = prop.width
          sprite.height = prop.width
        })
        .onComplete(() => {
        })

    alpha = { alpha: 0.9 }

    let vanish = new TWEEN.Tween(alpha)
        .to({ alpha: 0 }, 3000)
        .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
        .onUpdate(() => {
          sprite.alpha = alpha.alpha
        })
        .onComplete(() => {
          onComplete()
        })

    return expand.chain(vanish)
  },

  getSmokeTween(x, y, color = 0x999999, minWidth = 20, maxWidth = 50, shouldRandomizeDistance = true) {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache["white_smoke.png"])
    sprite.anchor.set(0.5)

    const randomDistanceX = shouldRandomizeDistance ? Math.floor(Math.random() * 64) - 32 : 0
    const randomDistanceY = shouldRandomizeDistance ? Math.floor(Math.random() * 64) - 32 : 0

    const randomWidth = Math.floor(Math.random() * (maxWidth - minWidth)) + minWidth
    sprite.width = randomWidth
    sprite.height = randomWidth
    sprite.tint = color
    sprite.position.x = x - randomDistanceX
    sprite.position.y = y - randomDistanceY

    game.sector.effectsContainer.addChild(sprite)

    let alpha = { alpha: 0.8 }

    var tween = new TWEEN.Tween(alpha)
        .to({ alpha: 0 }, 3000)
        .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
        .onUpdate(() => {
          sprite.alpha = alpha.alpha
        })
        .onComplete(() => {
          game.sector.effectsContainer.removeChild(sprite)
        })

    return {
      sprite: sprite,
      tween: tween
    }
  },

  getFadeTween(element, before, after, delay, duration = 1000) {
    if (element.style.display === 'none' && before === 0) {
      element.style.display = 'block'
      element.style.opacity = '0'
    }

    let opacity = { opacity: before }
    let tween = new TWEEN.Tween(opacity)
        .to({ opacity: after }, duration)
        .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
        .onUpdate(() => {
          element.style.opacity = opacity.opacity
        })
        .onComplete(() => {
          if (after === 0) {
            element.style.display = 'none'
          }
        })
        .delay(delay)

    return tween
  },

  getBulletTrailTween(x, y, angle, color = 0x999999, width = 8) {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache["bullet_trail.png"])
    sprite.anchor.set(0.5)
    sprite.rotation = angle

    sprite.width = 32
    sprite.height = width
    sprite.tint = color
    sprite.position.x = x
    sprite.position.y = y

    game.sector.effectsContainer.addChild(sprite)

    let alpha = { alpha: 0.8 }

    var tween = new TWEEN.Tween(alpha)
        .to({ alpha: 0 }, 400)
        .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
        .onUpdate(() => {
          sprite.alpha = alpha.alpha
        })
        .onComplete(() => {
          game.sector.effectsContainer.removeChild(sprite)
        })

    return tween
  },

  replaceQueryParam(param, newval, search) {
      var regex = new RegExp("([?;&])" + param + "[^&;]*[;&]?");
      var query = search.replace(regex, "$1").replace(/&$/, '');

      return (query.length > 2 ? query + "&" : "?") + (newval ? param + "=" + newval : '');
  }



}
