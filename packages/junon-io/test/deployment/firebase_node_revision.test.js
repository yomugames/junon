jest.mock('firebase-admin/app', () => ({}), { virtual: true })
jest.mock('firebase-admin/database', () => ({}), { virtual: true })

const { setNodeRevision } = require('../../../../deployment/set-firebase-node-revision')

test('revision rollout uses Firebase Admin v14 modular APIs', async () => {
  const set = jest.fn().mockResolvedValue()
  const ref = jest.fn().mockReturnValue({ set })
  const app = {}
  const firebaseAdmin = {
    applicationDefault: jest.fn().mockReturnValue('credential'),
    initializeApp: jest.fn().mockReturnValue(app),
    getDatabase: jest.fn().mockReturnValue({ ref }),
    deleteApp: jest.fn().mockResolvedValue()
  }
  const log = jest.spyOn(console, 'log').mockImplementation(() => {})

  try {
    await setNodeRevision({
      region: 'nyc1',
      nodeName: 'prime-nyc1-9471aeba',
      revision: '1234567',
      firebaseConfig: { databaseURL: 'https://junon-io.firebaseio.com' },
      firebaseAdmin
    })
  } finally {
    log.mockRestore()
  }

  expect(firebaseAdmin.initializeApp).toHaveBeenCalledWith({
    credential: 'credential',
    databaseURL: 'https://junon-io.firebaseio.com'
  })
  expect(ref).toHaveBeenCalledWith('/nodes/nyc1/prime-nyc1-9471aeba/revision')
  expect(set).toHaveBeenCalledWith('1234567')
  expect(firebaseAdmin.deleteApp).toHaveBeenCalledWith(app)
})
