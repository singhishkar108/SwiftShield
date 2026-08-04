/** @type {import('jest').Config} */
export default {
    testEnvironment: "node",
    testMatch: ["**/tests/**/*.test.js", "**/__tests__/**/*.test.js"],
    collectCoverageFrom: ["src/**/*.js", "!src/server.js"],
    verbose: true
  };
  