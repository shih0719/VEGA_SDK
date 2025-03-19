module.exports = {
  execute(data) {
    try {
      const jsonData = JSON.parse(data);
      const func = jsonData?.function;
      if (!func) {
        return null;
      }
      let rs = func;
      for (const key in rs) {
        if (key === "current") {
          rs[key] = rs[key] * 100;
        } else if (key === "electricity") {
          rs[key] = rs[key] * 100;
        } else if (key === "power") {
          rs[key] = rs[key] * 100;
        } else if (key === "voltage") {
          rs[key] = rs[key] * 10;
        } else if (key === "switch_ch1") {
          rs[key] = rs[key] ? 1 : 0;
        }
      }
      return rs;
    } catch (error) {
      console.error("Failed to parse JSON data:", error);
      return {};
    }
  },
};
