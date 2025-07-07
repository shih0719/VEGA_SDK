module.exports = {
  // 測試環境
  testEnvironment: "node",

  // 測試文件匹配模式
  testMatch: ["**/tests/**/*.test.js"],

  // 覆蓋率報告配置
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],

  // 需要收集覆蓋率的文件
  collectCoverageFrom: [
    "lib/**/*.js",
    "!lib/**/index.js",
    "!**/node_modules/**",
  ],

  // 每個測試文件運行前的設置文件
  setupFilesAfterEnv: ["./tests/setup.js"],

  // 測試超時設置（默認 5 秒）
  testTimeout: 10000,

  // 在錯誤堆棧中顯示詳細信息
  verbose: true,
};
