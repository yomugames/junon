const sendToServer = require("./send_to_server")

jest.setTimeout(30000)

function sleep(ms){
  return new Promise(resolve=>{
    setTimeout(resolve,ms)
  })
}

test('mob spawn/despawn', async () => {
  let memoryUsageBefore = await sendToServer("memoryUsage")

  await sendToServer("spawnMob", { count: 1000 })
  await sendToServer("removeMobs")

  let memoryUsageAfter = await sendToServer("memoryUsage")

  let memDiff = memoryUsageAfter - memoryUsageBefore

  let allowedMemDiff = 5000000 // 5mb

  console.log("memDiff: " + memDiff)
  expect(memDiff).toBeLessThan(allowedMemDiff)
})

test('building construct/deconstruct', async () => {
  let memoryUsageBefore = await sendToServer("memoryUsage")

  await sendToServer("createWall", { count: 1000 })
  // await sleep(1000)
  await sendToServer("removeBuildings")

  let memoryUsageAfter = await sendToServer("memoryUsage")

  let memDiff = memoryUsageAfter - memoryUsageBefore

  let allowedMemDiff = 5000000 // 5mb

  console.log("memDiff: " + memDiff)
  expect(memDiff).toBeLessThan(allowedMemDiff)
})

