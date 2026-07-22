const fs = require("fs");
const path = require("path");

describe("writeAudit", () => {
  const logDir = path.join(process.cwd(), "logs", "dev");
  const csvPath = path.join(logDir, "write-audit.csv");

  beforeEach(() => {
    if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
    jest.resetModules();
  });

  it("writes header once and appends one row per call", () => {
    const { recordWrite } = require("../lib/logger/writeAudit");
    recordWrite(100, "device/ac1", "power", 1);
    recordWrite(100, "device/ac1", "power", 0);

    const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n");
    expect(lines[0]).toBe("time,addr,topic,channel,value");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toMatch(/^[\d-]+ [\d:]+,100,device\/ac1,power,1$/);
    expect(lines[2]).toMatch(/^[\d-]+ [\d:]+,100,device\/ac1,power,0$/);
  });

  it("rotates the file once it exceeds maxSize, keeping only maxFiles", () => {
    const { rotate } = require("../lib/logger/writeAudit");
    fs.writeFileSync(csvPath, "time,addr,topic,channel,value\nx\n");
    rotate(1, 1); // tiny maxSize forces rotation -> archive #1

    fs.writeFileSync(csvPath, "time,addr,topic,channel,value\ny\n");
    rotate(1, 1); // second rotation -> archive #2, evicts #1 (maxFiles=1)

    expect(fs.existsSync(csvPath)).toBe(false);
    const archives = fs
      .readdirSync(logDir)
      .filter((f) => f.startsWith("write-audit_") && f.endsWith(".csv"));
    expect(archives).toHaveLength(1);

    archives.forEach((f) => fs.unlinkSync(path.join(logDir, f)));
  });
});
