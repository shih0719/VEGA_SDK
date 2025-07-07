const { ServiceError } = require("../../lib/errors");

describe("ServiceError", () => {
  const errorMessage = "Service error message";
  const errorCode = ServiceError.CODES.CONNECTION_ERROR;
  const serviceName = "MQTT";

  it("should create service error with correct properties", () => {
    const error = new ServiceError(errorMessage, errorCode, serviceName);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.message).toBe(errorMessage);
    expect(error.code).toBe(errorCode);
    expect(error.name).toBe("ServiceError");
    expect(error.serviceName).toBe(serviceName);
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it("should serialize to JSON with service name", () => {
    const error = new ServiceError(errorMessage, errorCode, serviceName);
    const json = error.toJSON();

    expect(json).toEqual({
      name: "ServiceError",
      message: errorMessage,
      code: errorCode,
      serviceName: serviceName,
      timestamp: error.timestamp,
      stack: error.stack,
    });
  });

  it("should have correct error codes defined", () => {
    expect(ServiceError.CODES).toEqual({
      CONNECTION_ERROR: 2001,
      TIMEOUT_ERROR: 2002,
      CONFIGURATION_ERROR: 2003,
      OPERATION_ERROR: 2004,
    });
  });

  it("should handle missing service name", () => {
    const error = new ServiceError(errorMessage, errorCode);

    expect(error.message).toBe(errorMessage);
    expect(error.code).toBe(errorCode);
    expect(error.serviceName).toBeUndefined();
  });

  it("should handle all error code cases", () => {
    const testCases = [
      {
        code: ServiceError.CODES.CONNECTION_ERROR,
        message: "Connection failed",
      },
      {
        code: ServiceError.CODES.TIMEOUT_ERROR,
        message: "Operation timeout",
      },
      {
        code: ServiceError.CODES.CONFIGURATION_ERROR,
        message: "Invalid configuration",
      },
      {
        code: ServiceError.CODES.OPERATION_ERROR,
        message: "Operation failed",
      },
    ];

    testCases.forEach(({ code, message }) => {
      const error = new ServiceError(message, code, serviceName);
      expect(error.code).toBe(code);
      expect(error.message).toBe(message);
      expect(error.serviceName).toBe(serviceName);
    });
  });

  it("should work with different service names", () => {
    const services = ["MQTT", "Modbus", "HTTP", "Database"];

    services.forEach((service) => {
      const error = new ServiceError(errorMessage, errorCode, service);
      expect(error.serviceName).toBe(service);
    });
  });
});
