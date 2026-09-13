const Helper = require('../../common/helper')

// On this uWebSockets.js build (verified against v20.70.0), WebSocket's
// getRemoteAddress() returns an empty ArrayBuffer - even when called
// synchronously inside the `open` handler. The fix is to capture the
// address from the HttpResponse in the `upgrade` handler (where
// getRemoteAddress() still works correctly) and hand it off as WebSocket
// user data, which uWS merges directly onto the socket as `remoteAddress`.
// getSocketRemoteAddress() must prefer that pre-populated value and never
// fall back to the broken call on a WebSocket.
function createMockUwsWebSocket() {
  return {
    getRemoteAddress() {
      return new ArrayBuffer(0)
    }
  }
}

function createMockUwsHttpResponse(ip) {
  const octets = ip.split('.').map(Number)
  const buffer = new ArrayBuffer(16)
  new Uint8Array(buffer).set(octets, 12)

  return {
    getRemoteAddress() {
      return buffer
    }
  }
}

test('getSocketRemoteAddress does not mutate the socket', () => {
  const res = createMockUwsHttpResponse('203.0.113.42')

  expect(Helper.getSocketRemoteAddress(res)).toBe('203.0.113.42')
  expect(res.remoteAddress).toBeUndefined()
})

test('getSocketRemoteAddress reads the HttpResponse remote address during upgrade', () => {
  const res = createMockUwsHttpResponse('203.0.113.42')

  expect(Helper.getSocketRemoteAddress(res)).toBe('203.0.113.42')
})

test('getSocketRemoteAddress prefers a pre-populated remoteAddress over the (broken) WebSocket call', () => {
  const ws = createMockUwsWebSocket()

  // Simulates uWS merging the `upgrade` handler's userData - captured from
  // the HttpResponse - directly onto the WebSocket object.
  ws.remoteAddress = '203.0.113.42'

  expect(Helper.getSocketRemoteAddress(ws)).toBe('203.0.113.42')
})

test('without a pre-populated remoteAddress, a WebSocket read observes the broken empty buffer', () => {
  const ws = createMockUwsWebSocket()

  expect(Helper.getSocketRemoteAddress(ws)).not.toBe('203.0.113.42')
})
