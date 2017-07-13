'use strict';

module.exports = function() {
	const client = './src/client/';
	const clientApp = client + 'app/';
	const tmp = './tmp/';
	const server = './src/server/';
	const root = './';
	const report = './report/';
	const wiredep = require('wiredep');
	const bowerFiles = wiredep({ devDependencies: true }).js;
	const specRunnerFile = 'specs.html';

	const CONFIG = {

		// File paths:

		index: client + 'index.html',

		build: './build/', // For production (if you check the server the assets are taken from different folders depending on
		// if we are in dev or build. Think about this and use it with caution in my project...)

		fonts: './bower_components/font-awesome/fonts/**/*.*',
		images: client + 'images/**/*.*',

		// All JS to lint:
		js: [
			'./src/**/*.js', // Inside src
			'./*.js', // In root (like this same Gulpfile.js)
		],

		jsToInject: [
			clientApp + '**/*.module.js',
			clientApp + '**/*.js',
			'!' + clientApp + '**/*.spec.js', // excluded
		],

		cssToInject: tmp + 'styles.css',


		// Template Cache:

		html: clientApp + '**/*.html',
		htmlTemplates: clientApp + '**/*.html',

		templateCache: {
			file: 'templates.js',
			options: {
				module: 'app.core',
				standAlone: false, // To avoid adding the dependency in the application, just attach to existing module
				root: 'app/',
			},
		},


		// All SCSS to compile:
		scss: [
			client + 'styles/styles.scss',
		],

		// Bower and NPM locations:

		bower: {
			json: require('./bower.json'),
			directory: './bower_components/',
			ignorePath: '../..',
		},

		packages: [
			'./package.json',
			'./bower.json',
		],

		// spec.html, our HTML spec runner:

		specRunner: client + specRunnerFile,
		specRunnerFile,
		testlibraries: [
			'node_modules/mocha/mocha.js',
			'node_modules/chai/chai.js',
			'node_modules/mocha-clean/index.js',
			'node_modules/sinon-chai/lib/sinon-chai.js',
		],

		// Node settings:

		defaultPort: 7203,
		nodeServer: './src/server/app.js',

		// Browser sync:

		browserReloadDelay: 1000,

		// Optimized file:

		optimized: {
			app: 'app.js',
			lib: 'lib.js',
		},

		specs: [
			clientApp + '**/*.spec.js',
		],

		// Karma and testing settings:

		specHelpers: [
			client + 'test-helpers/*.js',
		],
		serverIntegrationSpecs: [
			client + 'tests/server-integration/**/*.spec.js',
		],

		client, tmp, server, root, report
	};

	CONFIG.getWiredepDefaultOptions = () => {
		return {
			bowerJson: CONFIG.bower.json,
			directory: CONFIG.bower.directory,
			ignorePath: CONFIG.bower.ignorePath,
		};
	};

	CONFIG.karma = {
		files: [].concat(
			bowerFiles,
			CONFIG.specHelpers,
			client + '**/*.module.js',
			client + '**/*.js',
			tmp + CONFIG.templateCache.file,
			CONFIG.serverIntegrationSpecs
		),
		exclude: [],
		coverage: {
			dir: report + 'coverage',
			reporters: [
				{ type: 'html', subdir: 'report-html' },
				{ type: 'lcov', subdir: 'report-lcov' },
				{ type: 'text-summary' },
			],
		},
		preprocessors: {},
	};

	CONFIG.karma.preprocessors[clientApp + '**/!(*.spec)+(.js)'] = ['coverage'];

	return CONFIG;
};
