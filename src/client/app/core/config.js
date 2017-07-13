(function() {
	'use strict';

	var core = angular.module('app.core');

	core.config(toastrConfig);

	toastrConfig.$inject = ['toastr'];
	/* @ngInject */
	function toastrConfig(toastr) {
		toastr.options.timeOut = 4000;
		toastr.options.positionClass = 'toast-bottom-right';
	}

	var config = {
		appErrorPrefix: '[GulpPatterns Error] ', //Configure the exceptionHandler decorator
		appTitle: 'Gulp Patterns Demo',
		imageBasePath: '/images/photos/',
		unknownPersonImageSource: 'unknown_person.jpg'
	};

	core.value('config', config);

	core.config(configure);

	configure.$inject = ['$compileProvider', '$logProvider',
						 'routerHelperProvider', 'exceptionHandlerProvider'];
	/* @ngInject */
	function configure ($compileProvider, $logProvider, routerHelperProvider, exceptionHandlerProvider) {
		$compileProvider.debugInfoEnabled(false);

		// turn debugging off/on (no info or warn)
		if ($logProvider.debugEnabled) {
			$logProvider.debugEnabled(true);
		}
		exceptionHandlerProvider.configure(config.appErrorPrefix);
		configureStateHelper();

		////////////////

		function configureStateHelper() {
			var resolveAlways = { /* @ngInject */
				// ready: ready
				ready: function(dataservice) {
					return dataservice.ready();
				},
			};

			// With the version below ngAnnotate does not work automatically so we need to use an annotation.

			// ready.$inject = ['dataservice'];
			// function ready(dataservice) {
			//	 return dataservice.ready();
			// }

			routerHelperProvider.configure({
				docTitle: 'Gulp: ',
				resolveAlways: resolveAlways
			});
		}
	}
})();
