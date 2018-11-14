var gulp = require('gulp');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var streamify = require('gulp-streamify')
var streamMap = require('map-stream');
var uglify = require('gulp-uglify');

var targets = ['frame.inner.js', 'frame.outer.js', 'admin.js'];

gulp.task('watch', function(){
  targets.map(function(target){
    makeTask(target);
    gulp.watch(["./js/*.js", "./views/*.html"], [target]);
  });
});

var makeTask = function(target){
  gulp.task(target, function(){
    var bundleStream = browserify('./js/' + target)
                       .transform('brfs')
                       .bundle()
                       .pipe(source(target))
    return bundleStream
           .pipe(gulp.dest('./'));
  });
}
