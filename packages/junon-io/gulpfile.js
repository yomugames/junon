let gulp = require('gulp'),
  browserify = require('browserify'),
  ejs = require('gulp-ejs'),
  rev = require('gulp-rev'),
  gulpif = require('gulp-if'),
  path = require("path"),
  fs = require('fs'),
  gulpClean = require('gulp-clean'),
  buffer = require('vinyl-buffer'),
  source = require('vinyl-source-stream'),
  concat = require('gulp-concat'),
  replace = require('gulp-replace'),
  sourcemaps = require('gulp-sourcemaps'),
  process = require('process'),
  rename = require('gulp-rename'),
  pump = require('pump'),
  Terser = require("terser"),
  japaneseTranslationMap = require('./common/translations/ja'),
  englishTranslationMap = require('./common/translations/en'),
  russianTranslationMap = require('./common/translations/ru'),
  Polyglot = require('node-polyglot'),
  through = require('through2');

let series = gulp.series;
let watch = gulp.watch;

let gitVersion         = require('child_process').execSync('git rev-parse --short=7 HEAD').toString().trim()
let env                = process.env.NODE_ENV || 'development';
let paths
let gameVersion        = fs.readFileSync("VERSION.txt", 'utf8').replace("\n","")

let protocolDirectory = "node_modules/junon-common/protocol"
let protocolContents        = require('child_process').execSync(`cat ${protocolDirectory}/enum.proto ${protocolDirectory}/base.proto ${protocolDirectory}/app.proto`).toString()
let protocolHash = require('crypto').createHash('md5').update(protocolContents).digest("hex").substring(0,8)

console.log("gitVersion: " + gitVersion)
console.log("protocolHash: " + protocolHash)

const terserOptions = {
  ecma: 5,
  parse: {},
  compress: {
      keep_fargs: false,
      passes: 2,
      pure_funcs: [
          "Math.round",
          "Math.ceil",
          "Math.floor",
          "Math.sqrt",
          "Math.abs",
          "Math.max",
          "Math.min",
          "Math.sin",
          "Math.cos",
          "Math.tan",
          "Math.sign",
          "Math.pow",
          "Math.atan2",
      ],
      toplevel: true,
      unsafe_math: true,
      warnings: true
  },
  mangle: {
      eval: true,
      keep_classnames: false,
      keep_fnames: false,
      module: true,
      toplevel: true,
      safari10: true
  },
  output: {
      comments: false
  },

  toplevel: true,
  keep_classnames: false,
  keep_fnames: false,
  safari10: true
}

let buildPaths = (isProduction) => {
  let paths = {
    entry: './client/src/main.js',
    vendor: './client/src/vendor.js',
    dist: './client/dist/'
  }

  if (isProduction) {
    paths["dist"] = "./dist/"
  }

  return paths
}

let isProduction = false
let REV_MANIFEST_FILE = "dist/rev-manifest.json"
let REV_MANIFEST_FILE_WITHOUT_DIR = "rev-manifest.json"

let serverLibraries = ['winston', 'protobufjs']

function productionPaths (cb) {
  isProduction = true
  paths = buildPaths(isProduction)
  cb()
}

function developmentPaths(cb) {
  isProduction = false
  paths = buildPaths(isProduction)
  cb()
}

function watchFiles(cb) {
  let watchOptions = { ignoreInitial: false }
  watch('common/app.proto', watchOptions, copyProtobuf);
  watch('common/common.proto', watchOptions, copyProtobuf);
  watch('client/stylesheets/**/*.css', watchOptions, copyStylesheets);
  watch('client/src/**/*.js', watchOptions, developmentBrowserify)
  cb()
}

// PRODUCTION

// TASKS

function productionBrowserify(cb) {
  pump([
    browserify({ entries: [paths.entry] }).external(serverLibraries).bundle(),
    source('app.js'),
    buffer(),
    rev(),
    compressMangle(),
    gulp.dest(paths.dist),
    rev.manifest(REV_MANIFEST_FILE, { merge: true }),
    gulp.dest(paths.dist),
    rename(REV_MANIFEST_FILE_WITHOUT_DIR),
    gulp.dest(paths.dist)
  ], cb)
}

function compressMangle() {
  return through.obj(function (vinylFile, encoding, callback) {
    // 1. clone new vinyl file for manipulation
    // (See https://github.com/wearefractal/vinyl for vinyl attributes and functions)
    var transformedFile = vinylFile.clone();

    let filePath = vinylFile.history[0]
    let tokens = filePath.split("/")
    let fileName = tokens[tokens.length - 1]
    let sourceMapFileName = fileName.replace(".js", vinylFile.revHash + ".js") + ".map"

    let build = {}
    build[fileName] = vinylFile._contents.toString()

    let options = Object.assign({}, terserOptions, {
      sourceMap: {
        includeSources: true,
        url: sourceMapFileName
      }
    })

    let result = Terser.minify(build, options)

    require("fs").writeFileSync(paths.dist + sourceMapFileName, result.map)

    // 2. set new contents
    // * contents can only be a Buffer, Stream, or null
    // * This allows us to modify the vinyl file in memory and prevents the need to write back to the file system.
    transformedFile.contents = Buffer.from(result.code)

    // 3. pass along transformed file for use in next `pipe()`
    callback(null, transformedFile)
  });
}

function copyProtobuf(){
  let file = gulp.src('./node_modules/junon-common/protocol/*.proto')
                 .pipe(replace(/(\w+)\.proto/g, '$1-' + protocolHash + '.proto'))
                 .pipe(rename((path) => {
                   path.basename += `-${protocolHash}`
                 }))
                 .pipe(gulp.dest(paths.dist))

  return file
}

function clean(cb) {
   return gulp.src(paths.dist, {read: false})
        .pipe(gulpClean())
}

function developmentBrowserify() {
  /* When opts.debug is true, add a source map inline to the end of the bundle. 
     This makes debugging easier because you can see all the original files 
     if you are in a modern enough browser.
  */
  return browserify({ entries: [paths.entry], debug: true })
      .external(serverLibraries)
      .bundle()
      .on('error', function (e) {
        console.error(e)
        throw e
      })
      .pipe(source('app.js'))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(paths.dist))
}

function vendor(cb) {
  pump([
    browserify({ entries: paths.vendor }).bundle(),
    source('vendor.js'),
    buffer(),
    gulpif(isProduction, rev()),
    gulpif(isProduction, compressMangle()),
    gulp.dest(paths.dist),
    gulpif(isProduction, rev.manifest(REV_MANIFEST_FILE, { merge: true })),
    gulp.dest(paths.dist),
    rename(REV_MANIFEST_FILE_WITHOUT_DIR),
    gulp.dest(paths.dist),  // write assets to build dir
  ], cb)
}

function copyExternalLibs() {
  let file = gulp.src(['./client/src/lib/**'])
                   .pipe(gulp.dest(paths.dist))
  return file;
}

function copyAssets(cb) {
  let file = gulp.src(['./client/assets/**/*.*'])
                   .pipe(gulp.dest(paths.dist + "assets"))
  return file;
}

function copyHTML(cb) {
  let file = gulp.src(['./client/*.html'])
                   .pipe(gulp.dest(paths.dist))
  return file;
}

function copyAds(cb) {
  let file = gulp.src(['./client/ads.txt'])
                   .pipe(gulp.dest(paths.dist))
  return file;
}

function copyStylesheets(cb) {
  let file = gulp.src(['./client/stylesheets/gemini-scrollbar.css',
                       './client/stylesheets/firebaseui.css',
                       './client/stylesheets/style.css',
                       './client/stylesheets/mobile.css'])
                 .pipe(concat('application.css'))
                 .pipe(gulpif(isProduction, rev()))
                 .pipe(gulp.dest(paths.dist + "stylesheets"))
                 .pipe(gulpif(isProduction, rev.manifest(REV_MANIFEST_FILE, { merge: true })))
                 .pipe(gulp.dest(paths.dist))
                 .pipe(rename(REV_MANIFEST_FILE_WITHOUT_DIR))
                 .pipe(gulp.dest(paths.dist))

  return file;
}

function fetchChangeLogs() {
  let changeLogsDir = "changelogs"
  let changeLogFiles = fs.readdirSync(changeLogsDir)
  return changeLogFiles.sort((a, b) => {
    return versionValue(a) - versionValue(b)
  }).map((filename) => {
    let changeLogContent = JSON.parse(fs.readFileSync(path.resolve(changeLogsDir, filename), 'utf8'))
    return changeLogContent
  })
}

function versionValue(version) {
  let tokens = version.replace(".alpha", "").replace("v", "").split(".")
  return parseInt(tokens[0]) * 100000 + parseInt(tokens[1]) * 1000 + parseInt(tokens[2]) * 1
}

function compileStatus() {
  return gulp.src('client/status.ejs')
    .pipe(ejs({
      nodeEnv: env
    }))
    .pipe(rename('__status.html'))
    .on('error', function(e){ console.log(e); })
    .pipe(gulp.dest(paths.dist));
}

function compileIndexEn() {
  return compileIndex('en')
}

function compileIndexJa() {
  return compileIndex('ja')
}

function compileIndexRu() {
  return compileIndex('ru')
}

function getTranslationPhrases(language) {
  if (language === 'ja') return japaneseTranslationMap
  if (language === 'en') return englishTranslationMap
  if (language === 'ru') return russianTranslationMap

  throw new Error("invalid language")
}

function compileIndex(language) {
  // destination folder
  let destinationFolder = paths.dist

  if (language) {
    destinationFolder = destinationFolder + "/" + language

    if (!fs.existsSync(destinationFolder)) {
      fs.mkdirSync(destinationFolder)
    }
  }

  language = language || 'en'
  let i18n = new Polyglot({ phrases: getTranslationPhrases(language) })

  // read in our manifest file
  let manifest;
  manifest = JSON.parse(fs.readFileSync(REV_MANIFEST_FILE, 'utf8'));

  let changeLogs = fetchChangeLogs().reverse()

  return gulp.src('client/index.ejs')
    .pipe(ejs({
      nodeEnv: env,
      revision: gitVersion,
      changeLogs: changeLogs,
      gameVersion: gameVersion,
      protocolHash: protocolHash,
      language: language,
      test_vm: process.env.TEST_VM,
      assetPath: function(path){
        return manifest[path];
      },
      t: function(key, options) {
        return i18n.t(key, options)
      }
    }))
    .pipe(rename('index.html'))
    .on('error', function(e){ console.log(e); })
    .pipe(gulp.dest(destinationFolder));
};

function writeRevision(cb) {
  let paths = buildPaths(isProduction)

  if (!fs.existsSync(paths.dist)) {
    fs.mkdirSync(paths.dist)
  }

  fs.writeFileSync(paths.dist + 'revision', gitVersion)
  cb()
}

function compileChangelogs() {
  let paths = buildPaths(isProduction)
  let changeLogs = fetchChangeLogs().reverse()

  return gulp.src('client/changelogs.ejs')
    .pipe(ejs({
      changeLogs: changeLogs,
    }))
    .pipe(rename('changelogs.html'))
    .on('error', function(e){ console.log(e); })
    .pipe(gulp.dest(paths.dist));
}

// production

gulp.task('build', series(
  productionPaths,
  clean,
  writeRevision,
  copyProtobuf,
  copyExternalLibs,
  copyStylesheets,
  copyAssets,
  copyHTML,
  copyAds,
  vendor,
  productionBrowserify,
  compileStatus,
  compileIndexEn,
  compileIndexJa,
  compileIndexRu,
  compileChangelogs
))

// development

gulp.task('default', series(
  developmentPaths,
  clean,
  writeRevision,
  copyProtobuf,
  copyExternalLibs,
  copyStylesheets,
  vendor,
  compileChangelogs,
  watchFiles
))