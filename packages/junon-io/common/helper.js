const Protocol = require('./util/protocol')
const Constants = require('./constants')

module.exports = {
  MAX_PLAYERS_PER_SERVER: 50,
  MAX_PLAYERS_PER_GAME: 50,
  ENTITY_WALK_INTERACT_RANGE: 64,
  ENTITY_INTERACT_RANGE: 224,
  createES6Class(subKlass, name, methods) {
    methods = methods || {}

    let klass = class extends subKlass {
    }

    Object.defineProperty(klass, 'name', {value: name })

    if (typeof methods["static"] === "object") {
      Object.assign(klass, methods["static"])
    } 
    
    if (typeof methods["instance"] === "object") {
      Object.assign(klass.prototype, methods["instance"])
    }

    // so that it'll output nice in chrome console instead of showing "class extends"
    klass.toString = () => {
      return "class " + name + " {}"
    }

    return klass
  },
  getSocketRemoteAddress(socket) {
    let uint8Array = new Uint8Array(socket.getRemoteAddress())
    return [uint8Array[12], uint8Array[13], uint8Array[14], uint8Array[15]].join(".")
  },
  getRowColFromCoord(coord) {
    let rowCol = coord.split("-")
    rowCol[0] = parseInt(rowCol[0])
    rowCol[1] = parseInt(rowCol[1])
    return rowCol 
  },
  generateShuffledArrayIndex(array) {
    let list = Array.from(Array(array.length).keys())
    this.shuffleArray(list)
    return list
  },
  shuffleArray(array) {
    // https://stackoverflow.com/a/12646864
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1))
      var temp = array[i]
      array[i] = array[j]
      array[j] = temp
    }
  },
  createDynamicKlass(constantsNamespace, parentKlass, klassName) {
    return this.createES6Class(parentKlass, klassName, {
      static: {

      },
      instance: {
        getType() {
          return Protocol.definition().BuildingType[klassName]
        },
        getConstantsTable() {
          return constantsNamespace + "." + klassName
        }
      }
    })
  },
  isProtobufAttributeSet(data, attribute) {
    if (data.hasOwnProperty(attribute)) {
      if (data[attribute] instanceof Array) {
        return data[attribute].length > 0
      } else if (typeof data[attribute] === "object") {
        return Object.keys(data[attribute]).length > 0
      } else {
        return true
      }
    } else {
      return false
    }
  },
  batch(arr, len) {
    let batches = [],
        i = 0,
        n = arr.length;

    while (i < n) {
      batches.push(arr.slice(i, i += len))
    }

    return batches
  },
  capitalize(str) {
    return str.replace(/^\w/g, function(c) { return c.toUpperCase() })
  },
  capitalizeWords(str) {
    return str.split(' ')
              .map(function(w) { return w.charAt(0).toUpperCase() + w.substring(1) })
              .join(' ')
  },
  camelCase(str) {
    return str.replace(/(\_\w)/g, function(c) {
      return c[1].toUpperCase()
    })
  },
  camelToSnakeCase(str) {
    return str.replace(/[\w]([A-Z])/g, function(m) {
      return m[0] + "_" + m[1]
    }).toLowerCase()
  },
  getAttribute(o, s) {
    // https://stackoverflow.com/a/6491621
      var a = s.split('.')
      for (var i = 0, n = a.length; i < n; ++i) {
          var k = a[i]
          if (k in o) {
              o = o[k]
          } else {
              return
          }
      }
      return o
  },
  combineArrays(objValue, srcValue) {
    if (Array.isArray(objValue)) {
      return objValue.concat(srcValue)
    }
  },
  getChunkRowFromRow(row) {
    return Math.floor(row / Constants.chunkRowCount)
  },
  getChunkColFromCol(col) {
    return Math.floor(col / Constants.chunkColCount)
  },
  normalizeChunkRowCol(sector, rowOrCol) {
    const numOfChunksInRow = sector.getRowCount() / Constants.chunkRowCount
    let maxRowOrCol = numOfChunksInRow - 1

    if (rowOrCol < 0) return 0
    if (rowOrCol > maxRowOrCol) return maxRowOrCol

    return rowOrCol
  },
  getChunksFromBoundingBox(sector, boundingBox) {
    const chunkSize = Constants.chunkRowCount * Constants.tileSize

    let chunkStart = {
      row: this.normalizeChunkRowCol(sector, Math.floor(boundingBox.minY / chunkSize)),
      col: this.normalizeChunkRowCol(sector, Math.floor(boundingBox.minX / chunkSize))
    }

    let chunkEnd = {
      row: this.normalizeChunkRowCol(sector, Math.floor(boundingBox.maxY / chunkSize)),
      col: this.normalizeChunkRowCol(sector, Math.floor(boundingBox.maxX / chunkSize))
    }

    // chunkStart = { row: Math.floor(this.getY() / chunkSize), col: Math.floor(this.getX() / chunkSize) }
    // chunkEnd   = { row: Math.floor(this.getY() / chunkSize), col: Math.floor(this.getX() / chunkSize) }

    let chunks = {}

    for (var row = chunkStart.row; row <= chunkEnd.row; row++) {
      for (var col = chunkStart.col; col <= chunkEnd.col; col++) {
        let chunk = sector.getChunk(row, col)

        chunks[chunk.id] = chunk
      }
    }

    return chunks
  },
  isTargetWithinRange(entity, otherEntity) {
    const distance = this.distance(entity.getX(), entity.getY(), otherEntity.getX(), otherEntity.getY())
    return distance < this.ENTITY_INTERACT_RANGE
  },
  isTargetWithinWalkRange(entity, otherEntity) {
    const distance = this.distance(entity.getX(), entity.getY(), otherEntity.getX(), otherEntity.getY())
    return distance < this.ENTITY_WALK_INTERACT_RANGE
  },
  distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  },
  assetPath: (assetName) => {
    return "assets/" + assetName
  },
  pointFromDistance(x, y, distance, angle) {
    const xp = distance * Math.cos(angle)
    const yp = distance * Math.sin(angle)

    return [x + xp, y + yp]
  },
  angleDeltaSigned: (targetAngleInRad, sourceAngleInRad) => {
    // https://stackoverflow.com/questions/2708476/rotation-interpolation
    let endDeg   = targetAngleInRad * 180 / Math.PI
    let startDeg = sourceAngleInRad * 180 / Math.PI
    let shortestAngle = ((((endDeg - startDeg) % 360) + 540) % 360) - 180
    return shortestAngle * Math.PI / 180

    // const diff = (targetAngleInRad - sourceAngleInRad) * 180 / Math.PI
    // const angleInDeg = (diff + 180) % 360 - 180
    // return angleInDeg * Math.PI / 180
  },
  customMod: (a, n) => {
    // https://stackoverflow.com/a/7869457
    return a - Math.floor(a/n) * n
  },
  degToRad: (deg) => {
    return deg * Math.PI / 180
  },
  radToDeg: (rad) => {
    return rad * 180 / Math.PI 
  },
  swap: (json) => {
    var ret = {}
    for(var key in json){
      ret[json[key]] = key
    }
    return ret
  },
  ipToInt: (dot) => {
    var d = dot.split('.')
    return ((((((+d[0])*256)+(+d[1]))*256)+(+d[2]))*256)+(+d[3])
  },
  intToIp: (num) => {
    var d = num%256
    for (var i = 3; i > 0; i--)
    {
        num = Math.floor(num/256)
        d = num%256 + '.' + d
    }
    return d
  },
  stringifyTimeShort: (time) => {
    time = Math.round(time * 1000) / 1000

    var hours = parseInt( time / 3600 ) % 24
    var minutes = parseInt( time / 60 ) % 60
    var seconds = Math.floor(time % 60)
    var milliseconds = Math.floor(time * 1000) % 1000

    var result = ""
    var zeroPrependCheck = false

    if (hours !== 0) {
      result = result + hours
      zeroPrependCheck = true
      result += ":"
    }

    if (zeroPrependCheck) {
      result = result + (minutes < 10 ? "0" + minutes : minutes)
    } else {
      result = result + minutes
    }
    result += ":"

    zeroPrependCheck = true

    // if (seconds !== 0) {
    if (zeroPrependCheck) {
      result = result + (seconds < 10 ? "0" + seconds : seconds)
    } else {
      result = result + seconds
    }
    // }

    return result
  },
  getBuildingTypeByName(typeName) {
    return Protocol.definition().BuildingType[typeName]
  },
  getTypeNameById(id) {
    this.typeNamesById = this.typeNamesById || this.swapObject(Protocol.definition().BuildingType)
    return this.typeNamesById[id]
  },
  getNetworkNameById(id) {
    this.networkNamesById = this.networkNamesById || this.swapObject(Protocol.definition().NetworkType)
    return this.networkNamesById[id]
  },
  getResourceNameById(id) {
    this.resourceNamesById = this.resourceNamesById || this.swapObject(Protocol.definition().ResourceType)
    return this.resourceNamesById[id]
  },
  getProjectileNameById(id) {
    this.projectileNamesById = this.projectileNamesById || this.swapObject(Protocol.definition().ProjectileType)
    return this.projectileNamesById[id]
  },
  getTransportNameById(id) {
    this.transportNamesById = this.transportNamesById || this.swapObject(Protocol.definition().TransportType)
    return this.transportNamesById[id]
  },
  getMobNameById(id) {
    this.mobNameById = this.mobNameById || this.swapObject(Protocol.definition().MobType)
    return this.mobNameById[id]
  },
  getSoundNameById(id) {
    this.soundNameById = this.soundNameById || this.swapObject(Protocol.definition().SoundType)
    return this.soundNameById[id]
  },
  getTerrainNameById(id) {
    this.terrainNameById = this.terrainNameById || this.swapObject(Protocol.definition().TerrainType)
    return this.terrainNameById[id]
  },
  getEffectNameById(id) {
    this.effectNameById = this.effectNameById || this.swapObject(Protocol.definition().EffectType)
    return this.effectNameById[id]
  },
  getMobStatusNameById(id) {
    this.mobStatusNameById = this.mobStatusNameById || this.swapObject(Protocol.definition().MobStatus)
    return this.mobStatusNameById[id]
  },
  getBehaviorNameById(id) {
    this.behaviorNameById = this.behaviorNameById || this.swapObject(Protocol.definition().BehaviorType)
    return this.behaviorNameById[id]
  },
  roughSizeOfObject(object) {
    var objectSet = new WeakSet();
    var stack = [ object ];
    var bytes = 0;

    while ( stack.length ) {
        var value = stack.pop();

        if ( typeof value === 'boolean' ) {
            bytes += 4;
        }
        else if ( typeof value === 'string' ) {
            bytes += value.length * 2;
        }
        else if ( typeof value === 'number' ) {
            bytes += 8;
        }
        else if
        (
            typeof value === 'object'
            && value !== null 
            && !objectSet.has(value)
        )
        {
            objectSet.add(value);

            for( var i in value ) {
                let attribute = value[i];
                let attributeType = typeof attribute;
                if (['boolean', 'string', 'number', 'object'].indexOf(attributeType) !== -1) {
                    stack.push(attribute);
                }
            }
        }
    }
    return bytes;
  },
  swapObject(json) {
    var ret = {};
    for(var key in json){
      ret[json[key]] = key
    }
    return ret
  },

  // https://github.com/davidfig/intersects/blob/master/box-point.js
  /**
   * box-point collision
   * @param {number} x1 top-left corner of box
   * @param {number} y1 top-left corner of box
   * @param {number} w1 width of box
   * @param {number} h1 height of box
   * @param {number} x2 of point
   * @param {number} y2 of point
   * @return {boolean}
   */
  testBoxPoint(x1, y1, w1, h1, x2, y2) {
    return x2 >= x1 && x2 <= x1 + w1 && y2 >= y1 && y2 <= y1 + h1
  },

  testOverlap(circle, entity) {
    if (entity.isBuilding()) {
      let box = entity.getRelativeBox()
      return this.testBoxCircle(box.pos.x, box.pos.y, box.w, box.h, circle.x, circle.y, circle.radius)
    } else {
      return this.testCircleCircle(circle, entity.getCircle())
    } 
  },

  testCircleCircle(circle, otherCircle) {
    let a = circle.radius + otherCircle.radius
    let x = circle.x - otherCircle.x
    let y = circle.y - otherCircle.y

    return a > Math.sqrt((x * x) + (y * y))
  },

  // https://github.com/davidfig/intersects/blob/master/box-circle.js
  /**
   * box-circle collision
   * @param {number} xb top-left corner of box
   * @param {number} yb top-left corner of box
   * @param {number} wb width of box
   * @param {number} hb height of box
   * @param {number} xc center of circle
   * @param {number} yc center of circle
   * @param {number} rc radius of circle
   */
  testBoxCircle(xb, yb, wb, hb, xc, yc, rc) {
    var hw = wb / 2
    var hh = hb / 2
    var distX = Math.abs(xc - (xb + wb / 2))
    var distY = Math.abs(yc - (yb + hb / 2))

    if (distX > hw + rc || distY > hh + rc)
    {
        return false
    }

    if (distX <= hw || distY <= hh)
    {
        return true
    }

    var x = distX - hw
    var y = distY - hh
    return x * x + y * y <= rc * rc
  },

  randomIndexList(array) {
    let indexArray = Array.apply(0, new Array(array.length)).map((_,i) => { 
      return i
    })

    this.shuffleArray(indexArray)

    return indexArray
  },

  // https://gist.github.com/ryanmcgrath/982242
  isJapaneseText(text) {
    const regex = /[\u3000-\u303F]|[\u3040-\u309F]|[\u30A0-\u30FF]|[\uFF00-\uFFEF]|[\u4E00-\u9FAF]|[\u2605-\u2606]|[\u2190-\u2195]|\u203B/g 
    return regex.test(text)
  },

  /**
   * https://stackoverflow.com/a/12646864
   *
   * Randomize array element order in-place.
   * Using Durstenfeld shuffle algorithm.
   */
  shuffleArray(array) {
      for (var i = array.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1))
          var temp = array[i]
          array[i] = array[j]
          array[j] = temp
      }
  },

  isHashEmpty(obj) {
    for (let prop in obj) {
      if(obj.hasOwnProperty(prop)) {
        return false
      }
    }

    return true
  }

}
