const AWS = require('aws-sdk')

const spacesEndpoint = new AWS.Endpoint('nyc3.digitaloceanspaces.com')
s3 = new AWS.S3({
  endpoint: spacesEndpoint
})

const bucketName = process.env.S3_BUCKET_NAME || "junon"

const listEntries = (cb) => {
  const params = {
    Bucket: bucketName, 
    Prefix: "sectors/nyc1"
  }

  s3.listObjects(params, function(err, data) {
    if (err) {
      console.log(err, err.stack); // an error occurred
      return
    }

    data.Contents.forEach((content) => {
      cb(content.Key)
    })
  })
}

const download = (key, cb) => {
  const params = {
    Bucket: bucketName, 
    Key: key
  }

  s3.getObject(params, (err, data) => {
    console.log("downloaded " + key)
    cb(data.Body)
  })
 
}

const upload = (key, body, cb) => {
  const params = {
    Body: body, 
    Bucket: bucketName, 
    Key: key
  }

  s3.putObject(params, (err, data) => {
    if (err) {
      console.log(err, err.stack); // an error occurred
      return
    }

    console.log("uploaded to " + key)
  })
}

listEntries((sectorSaveKey) => {
  download(sectorSaveKey, (body) => {
    let newKey = sectorSaveKey.replace("sectors/nyc1","sectors/production")
                              .replace("sectors/fra1","sectors/production")
    upload(newKey, body)
  })
})