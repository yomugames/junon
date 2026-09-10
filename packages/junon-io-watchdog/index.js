global.env = process.env.NODE_ENV
global.debugMode = env === 'development'
global.region = process.env.REGION
global.nodeName = process.env.NODE_NAME

const fs = require('fs')
const AWS = require('aws-sdk')
const ExceptionReporter = require('junon-common/exception_reporter')
const FirebaseAdminHelper = require("./firebase_admin_helper")

FirebaseAdminHelper.init()

const isBuildPresent = () => {
  let binary = "s3cmd --host=nyc3.digitaloceanspaces.com --host-bucket='%(bucket)s.nyc3.digitaloceanspaces.com'"
  let cmd =  binary + ` ls s3://junon/builds/junon-io/${env}/build.tar.gz`
  let output = execCmdOutput(cmd)
  return output && output.length > 0
}

const downloadBuild = () => {
  let binary = "s3cmd --host=nyc3.digitaloceanspaces.com --host-bucket='%(bucket)s.nyc3.digitaloceanspaces.com'"
  let cmd =  binary + ` get --force s3://junon/builds/junon-io/${env}/build.tar.gz /root/build.tar.gz`
  return execCmd(cmd)
}

const extractBuildToNewApp = () => {
  execCmd("mkdir -p /root/new_app")
  let cmd = "tar xvzf /root/build.tar.gz -C /root/new_app"
  return execCmd(cmd)
}

const renameAppToOldApp = () => {
  execCmd("rm -rf /root/old_app")

  let cmd = "mv /root/app /root/old_app"
  return execCmd(cmd)
}

const renameNewAppToApp = () => {
  let cmd = "mv /root/new_app /root/app"
  return execCmd(cmd)
}

const execCmd = (cmd) => {
  try {
    console.log(cmd)
    require('child_process').execSync(cmd)
    return true
  } catch(e) {
    ExceptionReporter.captureException(e)
    return false
  }
}

const execCmdOutput = (cmd) => {
  try {
    console.log(cmd)
    return require('child_process').execSync(cmd).toString()
  } catch(e) {
    ExceptionReporter.captureException(e)
    return null
  }
}

const updateBuild = () => {
  let success

  success = isBuildPresent()
  if (!success) return

  success = downloadBuild()
  if (!success) return

  success = extractBuildToNewApp()
  if (!success) return

  success = renameAppToOldApp()
  if (!success) return

  renameNewAppToApp()

  console.log("build updated..")
}

const notifyFirebaseNodeRevision = (revision) => {
  FirebaseAdminHelper.notifyNodeRevision(region, nodeName, revision)
}

const restartServices = () => {
  let processorCount = execCmdOutput("cat /proc/cpuinfo | grep processor | wc -l")
  let serviceCountByCore = processorCount * 2

  let memTotalOutput = execCmdOutput("grep MemTotal /proc/meminfo")
  let totalMemory = parseInt(memTotalOutput.match(/\d+/)[0])
  let memoryPerGameServer = 1000000 
  let serviceCountByMemory = Math.ceil(totalMemory/memoryPerGameServer)

  let serviceCount = 5

  for (var i = 1; i <= serviceCount; i++) {
    restartServiceIfDown(i)
  }
}

const restartServiceIfDown = (index) => {
  if (isServiceDown(index)) {
    let serviceName = `junon-io@${index}`

    execCmd(`systemctl restart ${serviceName}`)
  }
}

const isServiceDown = (index) => {
  let unixSocket = "/var/run/liveness_probe_" + index

  if (!fs.existsSync(unixSocket)) return true

  let output = execCmdOutput(`echo 'ping' | nc -U -w 1 ${unixSocket}`)
  if (!output) return true

  return !output.toString().match(/^pong/)
}

const run = () => {
  FirebaseAdminHelper.onRevisionChanged((revision) => {
    console.log(revision)
    if (revision) {
      console.log("new revision: " + revision)
      // updateBuild()
      // notifyFirebaseNodeRevision(revision)
      restartServices()
    }
  })
}

// restart down services every 5 minutes
setInterval(restartServices, 60*1000*5)

run()



