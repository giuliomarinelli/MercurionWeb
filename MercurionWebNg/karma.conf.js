// Minimal Karma config override to bind to localhost on a random available port.
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
    reporters: ['progress'],
    browsers: ['ChromeHeadless'],
    singleRun: true,
  });
};
