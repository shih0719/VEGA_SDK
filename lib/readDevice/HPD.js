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
        if (key === "people") {
          rs[key] = rs[key] ? 1 : 0;
        } else if (key === "temp") {
          rs[key] = rs[key] * 10;
        } else if (key === "illumination") {
          rs[key] = rs[key];
        }
      }
      return rs;
    } catch (error) {
      console.error("Failed to parse JSON data:", error);
      return {};
    }
  },
};
