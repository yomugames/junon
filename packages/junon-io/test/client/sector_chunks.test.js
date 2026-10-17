const Sector = require('../../client/src/entities/sector')

describe('client sector chunks on rectangular worlds', () => {
  test.each([
    [64, 128, [3, 7], [4, 0]],
    [128, 64, [7, 3], [0, 4]]
  ])('%i rows by %i columns', (rowCount, colCount, lastChunk, outsideChunk) => {
    const sector = {
      getRowCount: () => rowCount,
      getColCount: () => colCount
    }
    Sector.prototype.initChunks.call(sector)

    const key = lastChunk.join('-')
    const chunk = { id: key }
    sector.chunks[key] = chunk

    expect(Sector.prototype.getChunk.call(sector, ...lastChunk)).toBe(chunk)
    expect(Sector.prototype.getChunk.call(sector, ...outsideChunk)).toBeNull()
  })
})
