const fs = require("fs");
const path = require("path");

describe("stateHistory", () => {
  const logDir = path.join(process.cwd(), "logs", "dev");
  const csvPath = path.join(logDir, "state-history.csv");

  beforeEach(() => {
    if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
    jest.resetModules();
  });

  it("writes header once and appends one row per call", () => {
    const { recordState } = require("../lib/logger/stateHistory");
    recordState("device/ac1", "aircondition", "power", 1);
    recordState("device/ac1", "aircondition", "power", 0);

    const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n");
    expect(lines[0]).toBe("time,topic,type,channel,value");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toMatch(/^[\d-]+ [\d:]+,device\/ac1,aircondition,power,1$/);
    expect(lines[2]).toMatch(/^[\d-]+ [\d:]+,device\/ac1,aircondition,power,0$/);
  });
});
