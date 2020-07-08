const { watch, dest } = require('gulp');
const browserify = require('browserify');
const source = require('vinyl-source-stream');

const b = browserify('./index.js');

function bundle() {
  return b.bundle()
    .pipe(source('bundle.js'))
    .pipe(dest('./'));
}

function watchFiles() {
  watch(['./index.js', './scenes/*.js'], { ignoreInitial: false }, bundle);
}

exports.default = watchFiles;
exports.bundle = bundle;