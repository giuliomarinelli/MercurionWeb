const path = require('path');

// Keep the CI browser and Karma server on the same explicit IPv4 loopback.
module.exports = function (config) {
  config.set({
    hostname: '127.0.0.1',
    listenAddress: '127.0.0.1',
    port: 9877,
    frameworks: ['jasmine'],
    plugins: [
      'karma-jasmine',
      'karma-chrome-launcher',
      'karma-coverage',
      'karma-jasmine-html-reporter'
    ],
    reporters: ['progress', 'coverage'],
    browsers: ['ChromeHeadless'],
    singleRun: true,
    coverageReporter: {
      dir: path.join(__dirname, 'coverage', 'angular'),
      reporters: [
        { type: 'html', subdir: 'html' },
        { type: 'lcovonly', subdir: '.' },
        { type: 'cobertura', subdir: '.', file: 'cobertura.xml' },
        { type: 'json', subdir: '.', file: 'coverage-final.json' },
        { type: 'json-summary', subdir: '.', file: 'coverage-summary.json' },
        { type: 'text-summary', subdir: '.', file: 'text-summary.txt' },
      ],
    },
  });
};
