/**
 * @type {Partial<jest.InitialOptions>}
 */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  rootDir: '.',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.ts?(x)',
    '<rootDir>/src/**/?(*.)+(spec|test).ts?(x)',
  ],
  testPathIgnorePatterns: ['build'],
  moduleDirectories: ['node_modules'],
  transformIgnorePatterns: ['node_modules/(?!(nact)/)'],
  globals: {
    NODE_ENV: 'test',
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
      diagnostics: false,
      isolatedModules: true,
    },
  },
};

module.exports = config;
