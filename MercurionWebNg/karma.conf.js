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
    reporters: ['progress'],
    browsers: ['ChromeHeadless'],
    singleRun: true,
  });
};
