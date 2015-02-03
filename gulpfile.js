var gulp = require('gulp'),
    $ = require('gulp-load-plugins')();

gulp.task('styles', function () {
  return gulp.src('app/static/scss/**/*.scss')
    .pipe($.sourcemaps.init())
      .pipe($.sass({
        onError: console.error.bind(console, 'Sass:')
      }))
      .pipe($.autoprefixer())
    .pipe($.sourcemaps.write('maps'))
    .pipe(gulp.dest('app/static/css'))
    .pipe($.rename({
      suffix: '.min'
    }))
    .pipe($.minifyCss())
    .pipe(gulp.dest('app/static/css'));
});

gulp.task('watch', ['styles'], function () {
  gulp.watch('app/static/scss/**/*', ['styles']);
});

gulp.task('default', ['styles']);