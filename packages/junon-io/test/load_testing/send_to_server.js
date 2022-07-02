const request = require('request')

const sendToServer = (message, queryOptions) => {
  let payload = {
    url: "http://localhost:8000/debug/" + message
  }

  if (queryOptions) {
    payload.qs = queryOptions
  }

  return new Promise((resolve, reject) => {
    request.get(payload, (err, res, body) => {
      if (err) { 
        console.log(err) 
        reject(err)
      } else {
        resolve(JSON.parse(body).result)
      }
    })
  })
}

module.exports = sendToServer
