const fs = require("fs");
const path = require("path");

/**
 * 合併兩個對象，返回一個新的對象，其中包含兩個對象中具有相同鍵的鍵值對
 * @param {Object} obj1 - 第一個對象
 * @param {Object} obj2 - 第二個對象
 * @returns {Map} result - 包含相同鍵的鍵值對的Map對象
 * Ex: {1:true,2:false}...
 * @throws {Error} Invalid JSON data
 */
function SameKeytoMap(obj1, obj2) {
  const result = new Map();
  try {
    for (const key in obj1) {
      if (
        obj2 &&
        typeof obj2 === "object" &&
        Object.prototype.hasOwnProperty.call(obj2, key)
      ) {
        result.set(obj1[key], obj2[key]);
      }
    }
    return result;
  } catch (error) {
    console.error("Failed to merge objects:", error);
    throw new Error("Invalid JSON data");
  }
}

module.exports = {
  SameKeytoMap,
};
