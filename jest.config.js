module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^authApp/EventBus$': '<rootDir>/src/__mocks__/EventBus.ts',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};