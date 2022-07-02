const AWS = require('aws-sdk');

AWS.config.update({
    signatureVersion: 'v4',
    region: 'us-west-2'
});

class S3Client {
  static getS3() {
    if (!this.s3) {
      this.s3 = new AWS.S3({signatureVersion: 'v4'})
    }

    return this.s3
  }

}

module.exports = S3Client