const Raid = require('../../server/entities/raid')

describe('when target structure is inside unclaimed room', () => {
  // working
  
  test('sky ground edge is available, spawn on it', () => {
    expect(true).toEqual(true)
  })

  test('sky edge is not available, spawn on farthest ground', () => {
    expect(true).toEqual(true)
  })
})

describe('raid spawn points', () => {
  test.each([
    [1, 1],
    [14, 1],
    [15, 2],
    [29, 2],
    [30, 3],
    [44, 3],
    [45, 4],
    [100, 4]
  ])('team day %i selects %i spawn point(s)', (daysAlive, expectedCount) => {
    let raid = Object.create(Raid.prototype)
    raid.team = { getNumDaysAlive: () => daysAlive }

    expect(raid.getDesiredSpawnPointCount()).toBe(expectedCount)
  })

  test('selects distinct spawn tiles, retrying rooms when needed', () => {
    let grounds = [
      { getRow: () => 1, getCol: () => 1 },
      { getRow: () => 2, getCol: () => 2 },
      { getRow: () => 1, getCol: () => 1 },
      { getRow: () => 3, getCol: () => 3 }
    ]
    let raid = Object.create(Raid.prototype)
    raid.getSortedSpawnRooms = () => [{}, {}]
    raid.determineSpawnGround = jest.fn()
      .mockReturnValueOnce(grounds[0])
      .mockReturnValueOnce(grounds[1])
      .mockReturnValueOnce(grounds[2])
      .mockReturnValueOnce(grounds[3])

    let selected = raid.determineSpawnGrounds({}, 3)

    expect(selected).toEqual([grounds[0], grounds[1], grounds[3]])
  })

  test('splits mob spawns across points without changing the total', () => {
    let raid = Object.create(Raid.prototype)
    raid.spawnGroundTiles = [
      { getX: () => 10, getY: () => 11 },
      { getX: () => 20, getY: () => 21 },
      { getX: () => 30, getY: () => 31 }
    ]
    raid.sector = { spawnMob: jest.fn() }

    raid.spawnMobsAtSpawnPoints('Guard', 7, 2)

    expect(raid.sector.spawnMob.mock.calls.map(([options]) => options.count)).toEqual([3, 2, 2])
    expect(raid.sector.spawnMob.mock.calls.map(([options]) => [options.x, options.y])).toEqual([
      [10, 11],
      [20, 21],
      [30, 31]
    ])
    expect(raid.getMobCountsPerSpawnPoint(2, 4)).toEqual([1, 1, 0, 0])
    expect(raid.getMobCountsPerSpawnPoint(5, 0)).toEqual([])
  })
})

describe('when target structure is inside homearea room', () => {
  test('an immediate room neighbor is unclaimed', () => {
    // working
    expect(true).toEqual(true)
  })

  test('an far-away room neighbor (3 traversals) is unclaimed', () => {
    // working
    expect(true).toEqual(true)
  })

  describe('zero neighbor rooms', () => {
    test('spawn on land edge if available - very thick walls lead to zero neighbor rooms', () => {
      expect(true).toEqual(true)
    })

    test('ship dock on door if available', () => {
      expect(true).toEqual(true)
    })

    test('ship dock on wall if available', () => {
      expect(true).toEqual(true)
    })

    test('ship destroy + dock near wall if cant fit on sky', () => {
      expect(true).toEqual(true)
    })
  })

  test('7 neighbor rooms. none is unclaimed', () => {
    expect(true).toEqual(true)
  })

})
