const axios = require('axios'); 

const sendToServer = (message, queryOptions) => {
  let config = {
    url: "http://localhost:8000/debug/" + message,
    method: 'get'
  };

  if (queryOptions) {
    config.params = queryOptions;
  }

  return axios(config)
    .then((response) => {
      return response.data.result;
    })
    .catch((err) => {
      console.log(err);
      throw err; 
    });
};
//i am not too sure about how axios works 
module.exports = sendToServer;