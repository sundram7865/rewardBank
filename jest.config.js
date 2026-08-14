module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/helpers/setupEnv.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};