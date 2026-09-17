// common/constants.json: Control { up: 1, down: 2, left: 4, right: 8, space: 16 }
const CONTROL = { up: 1, down: 2, left: 4, right: 8, space: 16 }

const MELEE_RANGE = 48 // Equipments.SurvivalTool stats.meleeRange (common/constants.json)
// stay well inside the real range so client-side position prediction drift
// never puts the *server-authoritative* distance just outside it
const SAFE_RANGE = MELEE_RANGE * 0.6
// re-engage movement only once well outside SAFE_RANGE, so standing right at
// the boundary doesn't flip-flop between phases every check
const DISENGAGE_RANGE = SAFE_RANGE * 1.8

function computeDelta(mobId) {
  const mob = window.game.sector.mobs[mobId]
  if (!mob || !window.player) return { alive: false }

  return {
    alive: true,
    dx: mob.getX() - window.player.getX(),
    dy: mob.getY() - window.player.getY()
  }
}

async function readState(page, mobId) {
  return page.evaluate(computeDelta, mobId)
}

// The server treats controlKeys as a persistent "held" state - it keeps
// moving the player every tick based on the last value it received until a
// *different* value arrives (server/entities/player.js: updateInput() ->
// this.controlKeys = data.controlKeys), exactly like a real held key.
//
// A naive Node-side loop ("read position, decide, wait ~100ms, repeat")
// assumes each round trip is fast. In this environment - three Node
// processes, a full browser and a gulp watcher sharing one box - a single
// page.evaluate() round trip measured 2-3 real seconds, not the ~100ms
// intended. Since the player keeps moving the whole time a direction is
// held, checking in from Node every "100ms" actually meant checking in
// every 2-3 real seconds, overshooting the target by hundreds of pixels
// every single time.
//
// page.waitForFunction() sidesteps this: the predicate polls *inside* the
// browser (no Node round trip per check), so "is it time to stop" is
// answered on the page's own clock instead of however long IPC happens to
// take. Node only gets involved at actual phase transitions (start/stop
// moving, start/stop attacking).
async function setControlKeys(page, bitmask) {
  await page.evaluate((bits) => {
    window.game.inputController.controlKeys = bits
    window.game.inputController.pressedKey = 0
    window.game.applyMyInputs()
  }, bitmask)
}

// Melee hits land on whatever is inside a circle offset *in front of the
// player, along its current facing angle* (server/entities/base_entity.js:
// getMeleeTargets() - the passed-in target id is only a hint, real
// resolution is purely geometric) - not wherever the player is walking.
// Facing is normally driven by mouse position (client/src/entities/
// input_controller.js: globalMouseMoveHandler() -> atan2(relativeY,
// relativeX) -> player.setAngle() + SocketUtil.emit("PlayerTarget", ...)).
// Since the player is always screen-centered, a delta in world space is
// already the same vector globalMouseMoveHandler expects relative to
// screen center, so a synthetic mouse-move event pointed at the mob drives
// the same real code (client prediction + server sync) a real mouse would.
async function faceTarget(page, dx, dy) {
  await page.evaluate(({ dx, dy }) => {
    const inputController = window.game.inputController
    const pixelRatio = window.game.getPixelRatio()
    const canvas = inputController.canvas
    const clientX = (canvas.width / 2 + dx) / pixelRatio
    const clientY = (canvas.height / 2 + dy) / pixelRatio
    inputController.globalMouseMoveHandler({ clientX, clientY })
  }, { dx, dy })
}

function directionBits(dx, dy, threshold) {
  let bits = 0
  if (dx > threshold) bits |= CONTROL.right
  else if (dx < -threshold) bits |= CONTROL.left
  if (dy > threshold) bits |= CONTROL.down
  else if (dy < -threshold) bits |= CONTROL.up
  return bits
}

// Melee combat ignores the clicked/hovered target entirely and auto-hits
// whatever is within the weapon's own range and facing cone - so unlike
// mining/building, there is no shortcut around real proximity or aim. This
// alternates two phases - close the distance, then stand and attack -
// re-facing the mob at each transition, and lets the browser's own clock
// (via waitForFunction) decide when a phase is done instead of guessing a
// duration from Node.
async function moveTowardAndAttack(page, mobId, { timeoutMs = 20_000 } = {}) {
  const deadline = Date.now() + timeoutMs

  try {
    while (Date.now() < deadline) {
      const state = await readState(page, mobId)
      if (!state.alive) return true

      await faceTarget(page, state.dx, state.dy)
      const remaining = Math.max(deadline - Date.now(), 0)
      if (remaining === 0) break

      const distance = Math.hypot(state.dx, state.dy)
      // re-face/re-evaluate at least this often even if the phase's exit
      // condition never triggers, so a slowly-drifting mob doesn't go stale
      const phaseTimeout = Math.min(remaining, 3_000)

      if (distance > SAFE_RANGE) {
        const bits = directionBits(state.dx, state.dy, SAFE_RANGE / 2)
        await setControlKeys(page, bits)

        await page.waitForFunction(
          ({ id, range }) => {
            const mob = window.game.sector.mobs[id]
            if (!mob || !window.player) return true // dead/gone counts as "done"
            const dx = mob.getX() - window.player.getX()
            const dy = mob.getY() - window.player.getY()
            return Math.hypot(dx, dy) <= range
          },
          { id: mobId, range: SAFE_RANGE },
          { timeout: phaseTimeout, polling: 50 }
        ).catch(() => {}) // timeout just means "re-evaluate from the top"
      } else {
        await setControlKeys(page, CONTROL.space)

        await page.waitForFunction(
          ({ id, range }) => {
            const mob = window.game.sector.mobs[id]
            if (!mob || !window.player) return true
            const dx = mob.getX() - window.player.getX()
            const dy = mob.getY() - window.player.getY()
            return Math.hypot(dx, dy) > range
          },
          { id: mobId, range: DISENGAGE_RANGE },
          { timeout: phaseTimeout, polling: 50 }
        ).catch(() => {})
      }
    }

    return false
  } finally {
    await setControlKeys(page, 0)
  }
}

module.exports = { moveTowardAndAttack }
