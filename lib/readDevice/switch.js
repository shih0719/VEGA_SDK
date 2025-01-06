module.exports = {
    execute(data) {
        try{
            const jsonData = JSON.parse(data); // 將 JSON 字符串轉換為對象
            const func = jsonData?.function;
            if(!func){
                return null;
            }
            const rs = func;
            //console.log(JSON.stringify(rs));
            // 處理數據的邏輯
            return rs;
        }catch (error) {
            console.error('Failed to parse JSON data:', error);
            throw new Error('Invalid JSON data');
        }
    }
  };
  