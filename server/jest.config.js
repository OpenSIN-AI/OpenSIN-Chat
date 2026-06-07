// SPDX-License-Identifier: MIT
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.js'],
  moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
  moduleFileExtensions: ['js', 'json', 'node'],
  transform: {},
  collectCoverageFrom: [
    'utils/**/*.js',
    'models/**/*.js',
    'endpoints/**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};