module.exports = {
  execute(FunctionKey, value) {
    if (FunctionKey === "switch_ch1") {
      value = value !== 0;
    }
    return {
      function: {
        [`${FunctionKey}`]: value,
      },
      cmd: "write",
      source: "vega-SDK",
    };
  },
};
