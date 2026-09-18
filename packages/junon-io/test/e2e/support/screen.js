// Turning a world coordinate into something the browser can be told to click.
//
// Almost every player action in this game is aimed with the mouse rather than
// addressed by entity id: mining, building placement and "interact" all resolve
// off whatever the cursor is over (client/src/entities/input_controller.js:
// globalMouseMoveHandler -> triggerEntityMouseEvents -> sector.pick). So a test
// that wants to mine *that* asteroid has to put the real cursor on it.
//
// The mapping is the inverse of base_entity.js#renderAtMousePosition:
//
//   world = (-game.cameraDisplacement.x + canvasX) / game.resolution
//
// where canvasX is in renderer pixels. The DOM event only carries CSS pixels,
// and every handler scales it by game.getPixelRatio() itself, so the cursor
// position a test must ask for is:
//
//   clientX = (world * resolution + cameraDisplacement.x) / pixelRatio
//
// resolution (zoom) and cameraDisplacement (camera scroll) both change during
// play, so this is read fresh out of the page on every call rather than cached.
function toClientPointInPage({ x, y }) {
  const game = window.game
  const ratio = game.getPixelRatio()

  return {
    x: (x * game.resolution + game.cameraDisplacement.x) / ratio,
    y: (y * game.resolution + game.cameraDisplacement.y) / ratio
  }
}

async function toClientPoint(page, worldX, worldY) {
  return page.evaluate(toClientPointInPage, { x: worldX, y: worldY })
}

// Moves the real cursor onto a world position. Real mouse events (rather than
// synthetic calls into globalMouseMoveHandler) are what keep PIXI's own
// interaction state in step: getGlobalMousePos() reads
// app.renderer.plugins.interaction.mouse.global, which only PIXI's own listener
// updates, and that is the position sector.pick() is asked about.
async function hoverWorld(page, worldX, worldY) {
  const point = await toClientPoint(page, worldX, worldY)
  await page.mouse.move(point.x, point.y)
  return point
}

// The centre of a tile, in world pixels.
const TILE_SIZE = 32 // common/constants.json tileSize

function tileCenter(row, col) {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2
  }
}

module.exports = { toClientPoint, hoverWorld, tileCenter, TILE_SIZE }
