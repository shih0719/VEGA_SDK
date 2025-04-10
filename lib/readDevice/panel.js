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
        if (key === "switch_ch1") {
          rs[key] = rs[key] ? 1 : 0;
        } else if (key === "button_id") {
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
