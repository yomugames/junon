const Helper = require('../../common/helper')

// Simulates uWebSockets.js's real behavior: getRemoteAddress() returns an
// ArrayBuffer that points directly at internal C++ stack memory. That memory
// is only valid for the duration of the native call that invoked the JS
// callback (e.g. the `open` handler). Any read attempted after that stack
// frame has unwound - a later `message`/`close` handler, a setTimeout, or an
// async function continuation - observes a detached/zero-length ArrayBuffer.
function createMockUwsSocket(ip) {
  const octets = ip.split('.').map(Number)
  const validBuffer = new ArrayBuffer(16)
  new Uint8Array(validBuffer).set(octets, 12)

  let callCount = 0
  return {
    getRemoteAddress() {
      callCount += 1
      // Only the very first (synchronous, same-stack-frame) call sees valid
      // native memory. Every subsequent call sees it already freed.
      return callCount === 1 ? validBuffer : new ArrayBuffer(0)
    }
  }
}

test('getSocketRemoteAddress does not mutate the socket', () => {
  const socket = createMockUwsSocket('203.0.113.42')

  expect(Helper.getSocketRemoteAddress(socket)).toBe('203.0.113.42')
  expect(socket.remoteAddress).toBeUndefined()
})

test('getSocketRemoteAddress stays correct when read again after the socket open handler returns, provided the address was cached during open', () => {
  const socket = createMockUwsSocket('203.0.113.42')

  // Must happen synchronously in the WS `open` handler, while uWS's native
  // buffer backing getRemoteAddress() is still valid.
  expect(Helper.cacheSocketRemoteAddress(socket)).toBe('203.0.113.42')

  // A later read - e.g. triggered from a `message` handler once a player
  // sends a join request - happens after uWS has already reclaimed the
  // stack memory backing the ArrayBuffer, and must still resolve correctly.
  expect(Helper.getSocketRemoteAddress(socket)).toBe('203.0.113.42')
})

test('getSocketRemoteAddress stays correct when read inside a later async callback, provided the address was cached up front', async () => {
  const socket = createMockUwsSocket('198.51.100.7')

  expect(Helper.cacheSocketRemoteAddress(socket)).toBe('198.51.100.7')

  await new Promise(resolve => setTimeout(resolve, 0))

  expect(Helper.getSocketRemoteAddress(socket)).toBe('198.51.100.7')
})

test('without caching up front, a later read observes the invalidated native buffer', () => {
  const socket = createMockUwsSocket('203.0.113.42')

  // Nothing primed the cache during `open`, so a later read - the bug this
  // guards against - re-touches uWS's already-freed native memory.
  expect(Helper.getSocketRemoteAddress(socket)).toBe('203.0.113.42')
  expect(Helper.getSocketRemoteAddress(socket)).not.toBe('203.0.113.42')
})
