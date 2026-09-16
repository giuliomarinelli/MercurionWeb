module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
    '^jose$': '<rootDir>/test-utils/mocks/jose.ts',
  },
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/../test/jest.setup.ts'],
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.test.ts',
    '!**/test-utils/**',
  ],
  coverageDirectory: '<rootDir>/../coverage/nest',
  coverageReporters: ['text', 'text-summary', 'json', 'json-summary', 'lcov', 'cobertura'],
  testEnvironment: 'node',
};
