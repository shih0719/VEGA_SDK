const { BaseError } = require("../../lib/errors");

describe("BaseError", () => {
  const errorMessage = "Test error message";
  const errorCode = 1000;

  it("should create error with correct properties", () => {
    const error = new BaseError(errorMessage, errorCode);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(BaseError);
    expect(error.message).toBe(errorMessage);
    expect(error.code).toBe(errorCode);
    expect(error.name).toBe("BaseError");
    expect(error.timestamp).toBeInstanceOf(Date);
    expect(error.stack).toBeDefined();
  });

  it("should serialize to JSON correctly", () => {
    const error = new BaseError(errorMessage, errorCode);
    const json = error.toJSON();

    expect(json).toEqual({
      name: "BaseError",
      message: errorMessage,
      code: errorCode,
      timestamp: error.timestamp,
      stack: error.stack,
    });
  });

  it("should capture stack trace", () => {
    const error = new BaseError(errorMessage, errorCode);

    expect(error.stack).toContain("BaseError");
    expect(error.stack).toContain(errorMessage);
  });

  it("should handle missing code parameter", () => {
    const error = new BaseError(errorMessage);

    expect(error.message).toBe(errorMessage);
    expect(error.code).toBeUndefined();
  });
});
