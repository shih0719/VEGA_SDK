const { DeviceError } = require("../../lib/errors");

describe("DeviceError", () => {
  const errorMessage = "Device error message";
  const errorCode = DeviceError.CODES.INVALID_DATA;
  const deviceType = "switch";

  it("should create device error with correct properties", () => {
    const error = new DeviceError(errorMessage, errorCode, deviceType);

    expect(error).toBeInstanceOf(DeviceError);
    expect(error.message).toBe(errorMessage);
    expect(error.code).toBe(errorCode);
    expect(error.name).toBe("DeviceError");
    expect(error.deviceType).toBe(deviceType);
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it("should serialize to JSON with device type", () => {
    const error = new DeviceError(errorMessage, errorCode, deviceType);
    const json = error.toJSON();

    expect(json).toEqual({
      name: "DeviceError",
      message: errorMessage,
      code: errorCode,
      deviceType: deviceType,
      timestamp: error.timestamp,
      stack: error.stack,
    });
  });

  it("should have correct error codes defined", () => {
    expect(DeviceError.CODES).toEqual({
      INVALID_DATA: 1001,
      PARSE_ERROR: 1002,
      INVALID_DEVICE_TYPE: 1003,
      TRANSFORMATION_ERROR: 1004,
    });
  });

  it("should handle missing device type", () => {
    const error = new DeviceError(errorMessage, errorCode);

    expect(error.message).toBe(errorMessage);
    expect(error.code).toBe(errorCode);
    expect(error.deviceType).toBeUndefined();
  });

  it("should handle all error code cases", () => {
    const testCases = [
      { code: DeviceError.CODES.INVALID_DATA, message: "Invalid data" },
      { code: DeviceError.CODES.PARSE_ERROR, message: "Parse error" },
      {
        code: DeviceError.CODES.INVALID_DEVICE_TYPE,
        message: "Invalid device type",
      },
      {
        code: DeviceError.CODES.TRANSFORMATION_ERROR,
        message: "Transformation error",
      },
    ];

    testCases.forEach(({ code, message }) => {
      const error = new DeviceError(message, code, deviceType);
      expect(error.code).toBe(code);
      expect(error.message).toBe(message);
    });
  });
});
