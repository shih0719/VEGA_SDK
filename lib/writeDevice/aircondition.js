module.exports = {
  execute(FunctionKey, value) {
    try {
      switch (FunctionKey) {
        case "power_on":
          if (value === 0) {
            value = false;
          } else {
            value = true;
          }
          break;
        case "model":
          if (value === 0) {
            value = "cold";
          } else if (value === 1) {
            value = "heat";
          } else if (value === 2) {
            value = "fan";
          }
          break;
        case "temperature":
          value = Math.round(value * 0.1);
          break;
        case "rev_speed":
          if (value === 0) {
            value = "auto";
          } else if (value === 1) {
            value = "low";
          } else if (value === 2) {
            value = "middle";
          } else if (value === 3) {
            value = "high";
          }
          break;
        default:
          throw new Error(`Invalid FunctionKey`);
      }
      return {
        function: {
          [`${FunctionKey}`]: value,
        },
        cmd: "write",
        source: "vega-SDK",
      };
    } catch (error) {
      console.error("Failed to write device:", error);
      return null;
    }
  },
};
