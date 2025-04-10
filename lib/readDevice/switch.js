module.exports = {
    execute(data) {
        try{
            const jsonData = JSON.parse(data); // 將 JSON 字符串轉換為對象
            const func = jsonData?.function;
            if(!func){
                return null;
            }
            const rs = func;
            // 將 rs 對象中的 true/false 值轉換為 1/0
            for (const key in rs) {
                if (typeof rs[key] === 'boolean') {
                    rs[key] = rs[key] ? 1 : 0;
                }
            }
            return rs;
        }catch (error) {
            console.error('Failed to parse JSON data:', error);
            return {};
        }
    }
  };
  