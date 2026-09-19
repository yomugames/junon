const sendToServer = (message, queryOptions) => {
  let url = new URL("http://localhost:8000/debug/" + message)

  if (queryOptions) {
    for (let key in queryOptions) {
      url.searchParams.set(key, queryOptions[key])
    }
  }

  return fetch(url)
    .then((res) => res.text())
    .then((body) => JSON.parse(body).result)
    .catch((err) => {
      console.log(err)
      throw err
    })
}

module.exports = sendToServer
