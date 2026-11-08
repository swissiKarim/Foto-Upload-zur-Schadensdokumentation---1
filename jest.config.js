/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '.agentsphere/reports',
      outputName: 'junit.xml',
      addFileAttribute: 'true',
      classNameTemplate: '{filepath}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
    }],
  ],
};
