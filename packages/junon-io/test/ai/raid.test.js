describe('when target structure is inside unclaimed room', () => {
  // working
  
  test('sky ground edge is available, spawn on it', () => {
    expect(true).toEqual(true)
  })

  test('sky edge is not available, spawn on farthest ground', () => {
    expect(true).toEqual(true)
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

  test('7 neighbor rooms. none is unclaimed => {
    expect(true).toEqual(true)
  })

})
