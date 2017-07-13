'use strict';

// IMPORT all gulp-* modules:

const $ = require('gulp-load-plugins')({ lazy: true });

// IMPORT other modules:

const _ = require('lodash');
const args = require('yargs').argv;
const browserSync = require('browser-sync');
const del = require('del');
const path = require('path');

const gulp = require('gulp');
const sequence = require('run-sequence');

// IMPORT CONFIG and other settings:

const CONFIG = require('./gulp.config')();
const port = process.env.PORT || CONFIG.defaultPort;


// TODO: ///////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
*  - Add a CSS lintern and an HTML one. The 3 of them will run in parallel. The JS one can be run in parallel for each
*    folder (?)
*  - gulp-autoprefixer vs autoprefixer
*  - https://github.com/postcss/autoprefixer#options
*  - Add SCSS maps: https://www.npmjs.com/package/gulp-sass
*  - Add "production" arg to minify, remove (skip) maps...
*  - Change bower and HTML injection for webpack or something similar
*  - Clean not working fine...
*/


// FUNCTIONS: //////////////////////////////////////////////////////////////////////////////////////////////////////////

// TODO: Add color parameter that check among possibles and defaults to XXX:
function log(msg) {
	if (typeof msg === 'object') {
		for (const item in msg) {
			if (msg.hasOwnProperty(item)) {
				$.util.log('\n\n' + $.util.colors.blue(msg[item]) + '\n');
			}
		}
	} else {
		$.util.log('\n\n' + $.util.colors.blue(msg) + '\n');
	}
}

// TODO: Use log function and test if it is working fine:
function handleError(err) {
	log(err.toString());
	this.emit('end');
}

function notify(options) {
	require('node-notifier').notify(_.assign({
		sound: 'Bottle',
		contentImage: path.join(__dirname, 'gulp.png'),
		icon: path.join(__dirname, 'gulp.png'),
	}, options));
}

function clean(path, done) {
	log('CLEANING ' + path + ':');

	del(path).then(() => {
		done();
	}).catch(() => {
		done();
	});
}

function changeEvent(event) {
	const srcPattern = new RegExp('/.*(?=/' + CONFIG.source + ')/');
	log('File ' + event.path.replace(srcPattern, '') + ' ' + event.type);
}

function startBrowserSync(isDev, specRunner) {
	if (args.nosync || browserSync.active) {
		return;
	}

	log('Starting browser-sync on port ' + port);

	if (isDev) {
		gulp.watch(CONFIG.scss, ['compile-scss'])
			.on('change', (event) => {
				changeEvent(event);
			});
	} else {
		gulp.watch([CONFIG.scss, CONFIG.js, CONFIG.html], ['optimize', browserSync.reload])
			.on('change', (event) => {
				changeEvent(event);
			});
	}

	// In build mode we want to make browserSync reload after a change just when the optimize task has been run again.

	const options = {
		proxy: 'localhost:' + port,
		port: 3000,
		files: isDev ? [
			CONFIG.client + '**/*.*',
			'!' + CONFIG.scss,
			CONFIG.tmp + '**/*.css',
		] : [],
		ghostMode: false, /* {
			click: false,
			location: false,
			forms: false,
			scroll: false,
		} */
		injectChanges: true,
		logFileChanges: true,
		logLevel: 'debug',
		logPrefix: 'gulp-patterns',
		notify: true,
		reloadDelay: 1000,
	};

	if (specRunner) {
		options.startPath = CONFIG.specRunnerFile; // Open this instead of index.html
	}

	browserSync(options);
}

function serve(isDev, specRunner) {
	const nodeOptions = {
		script: CONFIG.nodeServer,
		delayTime: 1,
		env: {
			PORT: port,
			NODE_ENV: isDev ? 'dev' : 'build',
		},
		watch: [
			CONFIG.server,
		],
	};

	return $.nodemon(nodeOptions)
		.on('start', () => {
			log('START');
			startBrowserSync(isDev, specRunner);
		})
		.on('restart', ['lint-js'], (ev) => {
			log('RESTART: ' + ev);

			setTimeout(() => {
				browserSync.notify('Reloading now...');
				browserSync.reload({ stream: false });
			}, CONFIG.browserReloadDelay);
		})
		.on('crash', () => {
			log('CRASH');
		})
		.on('exit', () => {
			log('EXIT');
		});
}

function startTests(singleRun, done) {
	const KarmaServer = require('karma').Server;
	const fork = require('child_process').fork;
	const serverSpecs = CONFIG.serverIntegrationSpecs;

	let excludedFiles = [];
	let child;

	if (args.startServer) { // gulp test --startServer
		log('Starting server');
		const savedEnv = process.env;
		savedEnv.NODE_ENV = 'dev';
		savedEnv.PORT = '8888';
		child = fork(CONFIG.nodeServer);
	} else if (serverSpecs && serverSpecs.length) {
		excludedFiles = serverSpecs;
	}

	new KarmaServer({
		configFile: __dirname + '/karma.conf.js',
		exclude: excludedFiles,
		singleRun: !!singleRun,
	}, (exitCode) => {
		if (child) {
			log('Shutting down the child process');
			child.kill();
		}

		if (exitCode === 0) {
			done();
		} else {
			done('Karma test server failed');
		}
	}).start();
}


// TASKS: //////////////////////////////////////////////////////////////////////////////////////////////////////////////

gulp.task('help', $.taskListing);

gulp.task('default', ['help']);

gulp.task('hello-world', () => {
	log('HELLO WORLD:');

	notify({
		title: 'gulp hello-world',
		subtitle: 'Just a simple test task',
		message: 'Running `gulp hello-world`',
	});

	$.util.log($.util.colors.yellow('Our first gulp task!'));
});

gulp.task('lint-js', () => {
	log('ANALYZING SOURCE WITH ESLINT:');

	return gulp
		.src(CONFIG.js)
		.pipe($.if(args.verbose, $.print()))
		.pipe($.eslint())
		.pipe($.eslint.format());
		//.pipe($.eslint.failAfterError()); // TODO: This breaks the autotest...
});

gulp.task('compile-scss', ['clean-css'], () => {
	log('Compiling SCSS to CSS...');

	return gulp
		.src(CONFIG.scss)
		.pipe($.plumber({ errorHandler: handleError }))
		.pipe($.sass())
		.pipe($.autoprefixer({
			browsers: ['last 2 versions', '> 5%'],
		}))
		.pipe(gulp.dest(CONFIG.tmp));
});

gulp.task('images', ['clean-images'], () => {
	log('Processing IMAGES...');

	return gulp
		.src(CONFIG.images)
		.pipe($.imagemin({ optimizationLevel: 4 }))
		.pipe(gulp.dest(CONFIG.build + 'images'));
});

gulp.task('fonts', ['clean-fonts'], () => {
	log('Copying FONTS...');

	return gulp.src(CONFIG.fonts)
		.pipe(gulp.dest(CONFIG.build + 'fonts'));
});

gulp.task('clean-css', (done) => {
	clean([].concat(
		CONFIG.tmp + '**/*.css',
		CONFIG.build + 'styles/**/*.css'
	), done);
});

gulp.task('clean-fonts', (done) => {
	clean(CONFIG.build + 'fonts/**/*.css', done);
});

gulp.task('clean-images', (done) => {
	clean(CONFIG.build + 'images/**/*.css', done);
});

gulp.task('clean', (done) => {
	log('CLEANING ALL...');
	del([].concat(CONFIG.build, CONFIG.tmp), done);
});

gulp.task('scss-watcher', (done) => {
	gulp.watch(CONFIG.scss, ['compile-scss']);
});

// TODO: Check this...

gulp.task('clean-code', (done) => {
	const files = [].concat(
		CONFIG.tmp + '**/*.js',
		CONFIG.build + '**/*.html',
		CONFIG.build + 'js/**/*.js'
	);

	clean(files, done);
});

gulp.task('templatecache', ['clean-code'], () => {
	log('Creating AngularJS $templateCache');

	return gulp
		.src(CONFIG.htmlTemplates)
		.pipe($.minifyHtml({ empty: true })) // Allow empty tags
		.pipe($.angularTemplatecache(
			CONFIG.templateCache.file,
			CONFIG.templateCache.options
		))
		.pipe(gulp.dest(CONFIG.tmp));
});

gulp.task('wiredep', () => {
	log('Wire up the bower css and js and our app js into the html');

	const wiredep = require('wiredep').stream;

	return gulp
		.src(CONFIG.index)
		.pipe(wiredep(CONFIG.getWiredepDefaultOptions()))
		.pipe($.inject(gulp.src(CONFIG.jsToInject)))
		.pipe(gulp.dest(CONFIG.client));
});

gulp.task('inject', ['wiredep', 'compile-scss', 'templatecache'], () => {
	log('Wire up the app css and call bowerep');

	return gulp
		.src(CONFIG.index)
		.pipe($.inject(gulp.src(CONFIG.cssToInject)))
		.pipe(gulp.dest(CONFIG.client));
});

gulp.task('build', ['optimize', 'images', 'fonts'], (done) => {
	log('Building everything:');

	const msg = {
		title: 'gulp build',
		subtitle: 'Deployed to the build folder',
		message: 'Running `gulp serve-build`',
	};

	del(CONFIG.tmp);
	log(msg);
	notify(msg);

	done();
});


gulp.task('serve-specs', ['build-specs'], (done) => {
	log('Run the spec runner...');

	serve(true /* isDev */, true /* specRunner */);

	done();
});

gulp.task('build-specs', ['templatecache'], () => {
	log('Building The Spec Runner...');

	const wiredep = require('wiredep').stream;
	const options = CONFIG.getWiredepDefaultOptions();

	let specs = CONFIG.specs;

	options.devDependencies = true;

	if (args.startServer) {
		specs = [].concat(specs, CONFIG.serverIntegrationSpecs);
	}

	return gulp
		.src(CONFIG.specRunner)
		.pipe(wiredep(options))
		.pipe($.inject(gulp.src(CONFIG.testlibraries), {
			name: 'inject:testlibraries',
			read: false,
		}))
		.pipe($.inject(gulp.src(CONFIG.jsToInject)))
		.pipe($.inject(gulp.src(CONFIG.specHelpers), {
			name: 'inject:spechelpers',
			read: false,
		}))
		.pipe($.inject(gulp.src(specs), {
			name: 'inject:specs',
			read: false,
		}))
		.pipe($.inject(gulp.src(CONFIG.tmp + CONFIG.templateCache.file), {
			name: 'inject:templates',
			read: false,
		}))
		.pipe(gulp.dest(CONFIG.client));
});

gulp.task('optimize', ['test', 'inject'], () => {
	log('Optimizing the JS, CSS and HTML:');

	const templateCache = CONFIG.tmp + CONFIG.templateCache.file;

	const cssFilter = $.filter('**/*.css', { restore: true });
	const jsAppFilter = $.filter('**/' + CONFIG.optimized.app, { restore: true });
	const jsLibFilter = $.filter('**/' + CONFIG.optimized.lib, { restore: true });

	return gulp
		.src(CONFIG.index)
		.pipe($.plumber())
		.pipe($.inject(gulp.src(templateCache, { read: false }), {
			starttag: '<!-- inject:templates:js -->',
		}))
		.pipe($.useref({ searchPath: './' }))

		.pipe(cssFilter)
			.pipe($.csso())
			.pipe($.rev())
		.pipe(cssFilter.restore)

		.pipe(jsAppFilter)
			.pipe($.ngAnnotate({
				// add: true,      // Default. Add annotations.
				// remove: true,   // Remove annotations.
			}))
			.pipe($.uglify())
			.pipe($.rev())
		.pipe(jsAppFilter.restore)

		.pipe(jsLibFilter)
			.pipe($.uglify())
			.pipe($.rev())
		.pipe(jsLibFilter.restore)

		.pipe($.revReplace())

		.pipe(gulp.dest(CONFIG.build))

		.pipe($.rev.manifest())

		.pipe(gulp.dest(CONFIG.build));
});

/*
* Bump the version
* --type=pre will bump the prerelease version *.*.*-x
* --type=patch or no flag will bump the patch version *.*.x
* --type=minor will bump the minor version *.x.*
* --type=major will bump the major version x.*.*
* --version=1.2.3 will bump to a specific version and ifnore other flags
*/
gulp.task('bump', () => {
	const type = args.type;
	const version = args.version;
	const options = {};

	let msg = 'Bumping versions';

	if (version) {
		options.version = version;
		msg += ' to ' + version;
	} else {
		options.type = type;
		msg += ' to ' + type;
	}

	return gulp
		.src(CONFIG.packages)
		.pipe($.bump(options))
		.pipe($.print())
		.pipe(gulp.dest(CONFIG.root));
});

gulp.task('serve-build', ['build'], () => {
	serve(false /* isDev */);
});

gulp.task('serve-dev', ['inject'], () => {
	serve(true /* isDev */);
});

gulp.task('test', ['lint-js', 'templatecache'], (done) => {
	startTests(true /* singleRun */, done);
});

gulp.task('autotest', ['lint-js', 'templatecache'], (done) => {
	startTests(false /* singleRun */, done);
});

