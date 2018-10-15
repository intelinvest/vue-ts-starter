/**
 * Сборка проекта
 */
const args = require('yargs').argv;
const gulp = require("gulp");
const minifyCSS = require('gulp-csso');
const sass = require('gulp-sass');
const webpack = require('webpack-stream');
const compiler = require('webpack');
const gutil = require('gulp-util');
const rename = require('gulp-rename');
const notifier = require('node-notifier');

const TARGET_DIR = args.env === "dev" ? "C:/_workspace/intelinvest_repo/intelinvest_maven/target/intelinvest_maven-2.0/frontend" : "dist";

gulp.task('scripts', () =>
    gulp.src('./src/index.ts')
        .pipe(webpack(require('./webpack.config.js')), compiler, (err, stats) => {
            if (error) { // кажется еще не сталкивался с этой ошибкой
                onError(error);
            } else if (stats.hasErrors()) { // ошибки в самой сборке, к примеру "не удалось найти модуль по заданному пути"
                onError(stats.toString(statsLog));
            } else {
                onSuccess(stats.toString(statsLog));
            }
        }).pipe(gulp.dest(TARGET_DIR)));

gulp.task('assets', () => {
    gulp.src('./src/assets/favicons/*.*')
        .pipe(gulp.dest(TARGET_DIR + '/favicons'));

    gulp.src('./node_modules/@fortawesome/fontawesome-free/css/all.css')
        .pipe(rename("fontawesome.css"))
        .pipe(minifyCSS())
        .pipe(gulp.dest(TARGET_DIR + '/css'));

    gulp.src('./node_modules/vuetify/dist/vuetify.css')
        .pipe(minifyCSS())
        .pipe(gulp.dest(TARGET_DIR + '/css'));

    gulp.src('./node_modules/@fortawesome/fontawesome-free/webfonts/*.*')
        .pipe(gulp.dest(TARGET_DIR + '/webfonts'));

    gulp.src('./src/assets/img/**/*.*')
        .pipe(gulp.dest(TARGET_DIR + '/img'));

    return gulp.src('./index.html')
        .pipe(gulp.dest(TARGET_DIR));
});

// Компиляция SCSS
gulp.task('css', () =>
    gulp.src('./src/assets/scss/index.scss')
        .pipe(sass({outputStyle: 'compressed'}))
        .pipe(minifyCSS())
        .pipe(gulp.dest(TARGET_DIR + '/css')));

// Основной таск сборки
gulp.task("build", ["scripts", "css", "assets"]);

/** Таск с watch */
gulp.task('default', ['build', "css", "assets"], () => {
    gulp.watch(['src/**/*.ts'], ['build']);
    gulp.watch(['src/assets/scss/**/*.scss'], ['css']);
    gulp.watch(['*.html'], ['assets']);
});

const onError = (error) => {
    let formattedError = new gutil.PluginError('webpack', error);
    notifier.notify({ // чисто чтобы сразу узнать об ошибке
        title: `Error: ${formattedError.plugin}`,
        message: formattedError.message
    });
    done(formattedError);
};

const onSuccess = (detailInfo) => {
    gutil.log('[webpack]', detailInfo);
    done();
};
