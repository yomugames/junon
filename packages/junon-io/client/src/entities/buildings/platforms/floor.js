const BaseFloor = require("./base_floor")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const perlin = require('perlin-noise');

class Floor extends BaseFloor {

  getBaseSpritePath() {
    return "solid_texture.png";
  }

  getTextureSpritePath() {
    if (this.data && this.data.textureIndex) {
      let textureName = this.game.floorTextures[this.data.textureIndex]
      return textureName
    }

    return "solid_texture.png";
  }

  getBuildingSprite(x, y) {
    //     let sprite = new PIXI.Container();

    //     let baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache["solid_texture.png"]);
    //     baseSprite.name = "FloorBase";

    //     let filter = new PIXI.Sprite(PIXI.utils.TextureCache["solid_texture.png"]);
    //     filter.name = "FloorFilter"
    //     // classic perlin 2D glsl, by Stefan Gustavson (https://github.com/stegu/webgl-noise)
    //    const fragmentSrc = `
    // precision mediump float;

    // varying vec2 vTextureCoord;
    // uniform sampler2D uSampler;

    // vec4 permute(vec4 x) {
    //     return mod(((x*34.0)+1.0)*x, 289.0);
    // }

    // vec2 fade(vec2 t) {
    //     return t*t*t*(t*(t*6.0-15.0)+10.0);
    // }

    // float cnoise(vec2 P) {
    //   vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
    //   vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
    //   Pi = mod(Pi, 289.0);
    //   vec4 ix = Pi.xzxz;
    //   vec4 iy = Pi.yyww;
    //   vec4 fx = Pf.xzxz;
    //   vec4 fy = Pf.yyww;
    //   vec4 i = permute(permute(ix) + iy);
    //   vec4 gx = 2.0 * fract(i * ${Math.random()}) - 1.0; // 1/41
    //   vec4 gy = abs(gx) - 0.5;
    //   vec4 tx = floor(gx + 0.5);
    //   gx = gx - tx;
    //   vec2 g00 = vec2(gx.x,gy.x);
    //   vec2 g10 = vec2(gx.y,gy.y);
    //   vec2 g01 = vec2(gx.z,gy.z);
    //   vec2 g11 = vec2(gx.w,gy.w);
    //   vec4 norm = 1.79284291400159 - 0.85373472095314 *
    //     vec4(dot(g00, g00), dot(g01, g01),
    //          dot(g10, g10), dot(g11, g11));
    //   g00 *= norm.x;
    //   g01 *= norm.y;
    //   g10 *= norm.z;
    //   g11 *= norm.w;
    //   float n00 = dot(g00, vec2(fx.x, fy.x));
    //   float n10 = dot(g10, vec2(fx.y, fy.y));
    //   float n01 = dot(g01, vec2(fx.z, fy.z));
    //   float n11 = dot(g11, vec2(fx.w, fy.w));
    //   vec2 fade_xy = fade(Pf.xy);
    //   vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
    //   float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
    //   return 2.3 * n_xy;
    // }

    //   void main(void) {
    //     vec4 color = texture2D(uSampler, vTextureCoord);

    //     float n = cnoise(vTextureCoord * .0) * 0.5 + 0.5;

    //     color.rgb *= 0.6 + n * 0.4;

    //     gl_FragColor = color;
    // }
    // `;

    //     let perlinFilter = new PIXI.Filter(undefined, fragmentSrc);

    //     filter.filters = [perlinFilter];
    //     filter.alpha = 0.2
    //     if (this.data.hasOwnProperty("colorIndex")) {
    //       let color = this.game.colors[this.data.colorIndex]
    //       baseSprite.tint = color.value
    //     }
    //     sprite.addChild(baseSprite);
    //     sprite.addChild(filter)
    //     return sprite;

    let sprite = new PIXI.Container()

    this.baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache["solid_texture.png"])
    this.baseSprite.anchor.set(0.5)

    // this.texture = new PIXI.Sprite(PIXI.utils.TextureCache["noiseTexture" + String(Math.floor(Math.random() * 6)) + ".png"])
    const baseTexture = PIXI.utils.TextureCache[this.getTextureSpritePath()]


    if (this.getTextureSpritePath() === "floormap.png") {
      const chunk = new PIXI.Rectangle(x % (31 * 32), y % (31 * 32), 32, 32)
      const texture = new PIXI.Texture(baseTexture, chunk)
      this.texture = new PIXI.Sprite(texture)
      this.texture.alpha = 0.2
    } else {
      this.texture = new PIXI.Sprite(baseTexture)
    }

    if (this.data.hasOwnProperty("colorIndex")) {
      let color = this.game.colors[this.data.colorIndex]
      this.baseSprite.tint = color.value
      this.texture.tint = color.value
    }

    this.texture.anchor.set(0.5)
    
    this.baseSprite.addChild(this.texture)
    sprite.addChild(this.baseSprite)
    return sprite;


  }


  getOverlayTexturePath() {
    return 'bevelled_texture.png'
  }

  getEdgeSpritePath() {
    return 'platform_edge.png'
  }

  hasEdgeSprite() {
    return false
  }

  getType() {
    return Protocol.definition().BuildingType.Floor
  }

  getConstantsTable() {
    return "Floors.Floor"
  }

}

module.exports = Floor
