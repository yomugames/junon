// Framing of game traffic over Steam Networking Sockets
// (junon-common/steam_framing.js): frames larger than a Steam message are
// split and reassembled in order, and malformed input from the peer throws.
const SteamFraming = require('junon-common/steam_framing')
const { SteamFrameAssembler, KIND_TEXT, KIND_BINARY, KIND_CONTROL, MAX_CHUNK_LENGTH } = SteamFraming

function roundTrip(kind, data, maxChunkLength) {
  const assembler = new SteamFrameAssembler()
  const messages = SteamFraming.encode(kind, data, maxChunkLength)
  const frames = messages.map((message) => assembler.push(message)).filter(Boolean)
  return { messages, frames }
}

test('text, binary and control frames round trip', () => {
  expect(roundTrip(KIND_TEXT, '{"event":"Ping","data":{}} ✓').frames).toEqual([{ kind: KIND_TEXT, data: '{"event":"Ping","data":{}} ✓' }])

  const bytes = new Uint8Array([0, 1, 2, 250, 255])
  const binary = roundTrip(KIND_BINARY, bytes).frames
  expect(binary).toHaveLength(1)
  expect(Buffer.isBuffer(binary[0].data)).toBe(true)
  expect([...binary[0].data]).toEqual([...bytes])

  const assembler = new SteamFrameAssembler()
  const [hello] = SteamFraming.encodeControl({ type: 'hello', version: 1, protocol: 'abcd1234' })
  expect(assembler.push(hello)).toEqual({ kind: KIND_CONTROL, data: { type: 'hello', version: 1, protocol: 'abcd1234' } })
})

test('encodes a view of a larger buffer without its neighbours', () => {
  const backing = Buffer.from([9, 9, 1, 2, 3, 9])
  const { frames } = roundTrip(KIND_BINARY, backing.subarray(2, 5))
  expect([...frames[0].data]).toEqual([1, 2, 3])

  const arrayBuffer = new Uint8Array([4, 5]).buffer
  expect([...roundTrip(KIND_BINARY, arrayBuffer).frames[0].data]).toEqual([4, 5])
})

test('splits frames above the chunk size and reassembles them', () => {
  const exact = Buffer.alloc(MAX_CHUNK_LENGTH, 7)
  expect(roundTrip(KIND_BINARY, exact).messages).toHaveLength(1)

  const large = Buffer.alloc(MAX_CHUNK_LENGTH * 2 + 1)
  for (let i = 0; i < large.length; i++) large[i] = i % 251
  const { messages, frames } = roundTrip(KIND_BINARY, large)
  expect(messages).toHaveLength(3)
  messages.forEach((message) => expect(message.length).toBeLessThan(512 * 1024))
  expect(frames).toHaveLength(1)
  expect(frames[0].data.equals(large)).toBe(true)

  // small chunks: first, middle..., last
  const text = 'abcdefghij'
  const split = roundTrip(KIND_TEXT, text, 3)
  expect(split.messages.map((message) => message[1])).toEqual([1, 2, 2, 3])
  expect(split.frames).toEqual([{ kind: KIND_TEXT, data: text }])
})

test('frames keep their order across several messages', () => {
  const assembler = new SteamFrameAssembler()
  const messages = [].concat(
    SteamFraming.encode(KIND_TEXT, 'first', 2),
    SteamFraming.encode(KIND_BINARY, Buffer.from([1, 2, 3])),
    SteamFraming.encode(KIND_TEXT, 'third', 4)
  )
  const frames = messages.map((message) => assembler.push(message)).filter(Boolean)
  expect(frames.map((frame) => frame.kind)).toEqual([KIND_TEXT, KIND_BINARY, KIND_TEXT])
  expect(frames[0].data).toBe('first')
  expect(frames[2].data).toBe('third')
})

test('rejects malformed messages', () => {
  const message = (bytes) => Buffer.from(bytes)
  expect(() => new SteamFrameAssembler().push(message([]))).toThrow('Malformed')
  expect(() => new SteamFrameAssembler().push(message([1]))).toThrow('Malformed')
  expect(() => new SteamFrameAssembler().push(message([9, 0, 1]))).toThrow('Unknown frame kind')
  expect(() => new SteamFrameAssembler().push(message([1, 9, 1]))).toThrow('Unknown fragment')
  expect(() => new SteamFrameAssembler().push(message([1, 2, 1]))).toThrow('without a frame')
  expect(() => new SteamFrameAssembler().push(message([1, 3, 1]))).toThrow('without a frame')
  expect(() => new SteamFrameAssembler().push(message([KIND_CONTROL, 0, 0x7b]))).toThrow()
  expect(() => new SteamFrameAssembler().push(Buffer.concat([message([KIND_CONTROL, 0]), Buffer.from('[1]')]))).toThrow('Malformed control')

  // a new frame can't start inside another, nor switch kind midway
  let assembler = new SteamFrameAssembler()
  assembler.push(message([KIND_TEXT, 1, 0x61]))
  expect(() => assembler.push(message([KIND_TEXT, 0, 0x61]))).toThrow('Unfinished')
  assembler = new SteamFrameAssembler()
  assembler.push(message([KIND_TEXT, 1, 0x61]))
  expect(() => assembler.push(message([KIND_BINARY, 3, 0x61]))).toThrow('without a frame')
})

test('caps the size of a reassembled frame', () => {
  const assembler = new SteamFrameAssembler(10)
  const messages = SteamFraming.encode(KIND_BINARY, Buffer.alloc(11), 4)
  expect(() => messages.forEach((message) => assembler.push(message))).toThrow('too large')

  expect(() => SteamFraming.encode(KIND_BINARY, Buffer.alloc(SteamFraming.MAX_FRAME_LENGTH + 1))).toThrow('too large')
  expect(() => SteamFraming.encode(7, 'x')).toThrow('Unknown frame kind')
})

test('the outbox waits while Steam\'s send buffer is full', () => {
  const sent = []
  let isFull = false
  const outbox = new SteamFraming.SteamOutbox((message) => {
    if (isFull) return 25 // LimitExceeded
    sent.push(message)
    return 1
  }, 10)

  const a = Buffer.alloc(3, 1)
  const b = Buffer.alloc(3, 2)
  expect(outbox.enqueue([a, b])).toBe(true)
  isFull = true
  expect(outbox.flush()).toBe('blocked')
  expect(outbox.isEmpty()).toBe(false)

  isFull = false
  expect(outbox.flush()).toBe('sent')
  expect(sent).toEqual([a, b])
  expect(outbox.isEmpty()).toBe(true)

  // a guest that falls too far behind overflows
  isFull = true
  expect(outbox.enqueue([Buffer.alloc(6)])).toBe(true)
  expect(outbox.enqueue([Buffer.alloc(6)])).toBe(false)

  const broken = new SteamFraming.SteamOutbox(() => 3) // NoConnection
  broken.enqueue([a])
  expect(broken.flush()).toBe('failed')
})
