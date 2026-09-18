// common/constants.json: Control { up: 1, down: 2, left: 4, right: 8, space: 16 }
const CONTROL = { up: 1, down: 2, left: 4, right: 8, space: 16 }

// Melee does NOT hit everything within meleeRange of the player.
// getMeleeTargets() (server/entities/base_entity.js) builds a circle *centred
// meleeRange pixels ahead* of the player along its facing angle, with radius
// attackRadius || tileSize, and hits whatever overlaps that circle:
//
//     player                     circle centre
//       o - - - - - - - - - - - - - -( 48 )- - - - - - - - -
//       |<-- dead zone -->|<--------- hittable --------->|
//       0                 16                            80
//
// so for a SurvivalTool (meleeRange 48, no attackRadius, so radius =
// tileSize 32) the reachable band is ~16..80px: an annulus, not a disc.
// Standing *too close* whiffs just as reliably as standing too far. That is
// the trap the first version of this helper fell into - it closed to
// meleeRange * 0.6 and any overshoot from there pushed the mob into the dead
// zone right in front of the player.
const MELEE_RANGE = 48 // Equipments.SurvivalTool stats.meleeRange
const ATTACK_RADIUS = 32 // Constants.tileSize, the default when attackRadius is unset
const HIT_MIN = MELEE_RANGE - ATTACK_RADIUS // 16
const HIT_MAX = MELEE_RANGE + ATTACK_RADIUS // 80
// aim for the middle of the band, so drift in either direction still connects
const ENGAGE_RANGE = MELEE_RANGE
// when a mob has shoved the player into the dead zone, back out only just far
// enough to swing again. Retreating all the way to ENGAGE_RANGE overshot past
// HIT_MAX and started another approach, so the player spent the fight pacing
// in and out instead of hitting.
const REENGAGE_RANGE = HIT_MIN + 12 // 28

// The whole fight runs inside the page, in one evaluate, and this is the
// point of the whole file rather than a micro-optimisation.
//
// The server treats controlKeys as a persistent "held" state: it keeps moving
// the player every tick using the last value it received until a *different*
// value arrives (server/entities/player.js: updateInput()), exactly like a
// real held key. So "stop walking" is a message that has to arrive, and until
// it does the player is still moving at ~280px/s.
//
// Driving that from Node - even with page.waitForFunction() polling the
// distance inside the browser - overshoots, because only the *decision* is
// made in the browser: the resulting setControlKeys(0) still has to cross back
// over IPC. That round trip was measured at 100-300ms here, which is 30-80px
// of extra walking, and the hittable band is only 64px wide. A traced run
// went 119px -> 66px -> 10px between samples and ended up inside the dead
// zone with the mob shoving against the player, where hits land only by
// accident. Braking in-page instead stops within a frame of the band being
// reached, so the player reliably ends the approach where its weapon can
// actually reach.
//
// Everything below therefore runs on the page's own clock, against the real
// client objects (inputController, applyMyInputs, globalMouseMoveHandler), and
// Node only awaits the verdict.
function fightInPage({ id, timeoutMs, hitMin, hitMax, engageRange, reengageRange, control }) {
  const game = window.game
  const inputController = game.inputController
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const deadline = performance.now() + timeoutMs

  // The client's own game loop calls applyMyInputs() every frame
  // (client/src/entities/game.js: updateGame), and with the space bit held
  // that re-fires performAction() -> act() -> emit("Act") each frame, throttled
  // by canAct()'s 200ms cooldown. So holding space keeps swinging by itself;
  // this only has to set the state, not drive individual swings. controlKeys is
  // only ever mutated by real key/mouse events (input_controller.js), never
  // recomputed per frame, so assigning it directly really does mean "held".
  const setKeys = (bits) => {
    inputController.controlKeys = bits
    inputController.pressedKey = 0
    game.applyMyInputs()
  }

  // Melee resolves off the player's facing angle, not off what it is walking
  // toward, and not off the entity id the client sends - the id in emit("Act")
  // is only a hint, and getMeleeTargets() re-resolves purely geometrically.
  // Facing is normally driven by the mouse (input_controller.js:
  // globalMouseMoveHandler -> atan2 -> player.setAngle() + emit("PlayerTarget")).
  // The player is always screen-centred, so a world-space delta is already the
  // vector that handler expects relative to screen centre - a synthetic
  // mouse-move pointed at the mob drives exactly the code a real mouse would.
  const face = (dx, dy) => {
    const pixelRatio = game.getPixelRatio()
    const canvas = inputController.canvas
    inputController.globalMouseMoveHandler({
      clientX: (canvas.width / 2 + dx) / pixelRatio,
      clientY: (canvas.height / 2 + dy) / pixelRatio
    })
  }

  const delta = () => {
    const mob = game.sector.mobs[id]
    if (!mob || !window.player) return null

    const dx = mob.getX() - window.player.getX()
    const dy = mob.getY() - window.player.getY()
    return { dx, dy, distance: Math.hypot(dx, dy) }
  }

  const bitsToward = (dx, dy, threshold) => {
    let bits = 0
    if (dx > threshold) bits |= control.right
    else if (dx < -threshold) bits |= control.left
    if (dy > threshold) bits |= control.down
    else if (dy < -threshold) bits |= control.up
    return bits
  }

  // walk while `shouldKeepGoing` holds, braking the moment it stops holding
  const walk = async (bits, shouldKeepGoing) => {
    setKeys(bits)

    try {
      while (performance.now() < deadline) {
        const current = delta()
        if (!current) return null
        if (!shouldKeepGoing(current.distance)) return current
        await sleep(16)
      }

      return delta()
    } finally {
      setKeys(0)
    }
  }

  const run = async () => {
    while (performance.now() < deadline) {
      const state = delta()
      if (!state) return true // mob gone from the synced registry == killed

      face(state.dx, state.dy)

      if (state.distance > hitMax) {
        // close the distance, stopping mid-band rather than walking into the mob
        await walk(
          bitsToward(state.dx, state.dy, engageRange / 2),
          (distance) => distance > engageRange
        )
      } else if (state.distance < hitMin) {
        // too close to swing: a mob that closes in to attack (Brood range 32)
        // can shove the player into its own dead zone, so back out of it
        await walk(
          bitsToward(-state.dx, -state.dy, 0),
          (distance) => distance < reengageRange
        )
      } else {
        setKeys(control.space)

        try {
          // hold the swing until the mob dies or leaves the band, re-aiming as
          // it moves. ~5 swings at 2 damage on a 200ms cooldown kills a Brood,
          // so this normally resolves in about a second.
          while (performance.now() < deadline) {
            const current = delta()
            if (!current) return true
            if (current.distance < hitMin || current.distance > hitMax) break
            face(current.dx, current.dy)
            await sleep(50)
          }
        } finally {
          setKeys(0)
        }
      }
    }

    return !delta()
  }

  return run().finally(() => setKeys(0))
}

async function moveTowardAndAttack(page, mobId, { timeoutMs = 20_000 } = {}) {
  return page.evaluate(fightInPage, {
    id: mobId,
    timeoutMs,
    hitMin: HIT_MIN,
    hitMax: HIT_MAX,
    engageRange: ENGAGE_RANGE,
    reengageRange: REENGAGE_RANGE,
    control: CONTROL
  })
}

module.exports = { moveTowardAndAttack }
