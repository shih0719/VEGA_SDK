module.exports = {
    execute(data) {
        try{
            const jsonData = JSON.parse(data); // 將 JSON 字符串轉換為對象
            const func = jsonData?.function;
            if(!func){
                return null;
            }
            const switches = [
                func?.switch_ch1 ?? null,
                func?.switch_ch2 ?? null,
                func?.switch_ch3 ?? null,
                func?.switch_ch4 ?? null
            ];
            // 處理數據的邏輯
            return `Processed by switch with ${String(switches)}`;
        }catch (error) {
            console.error('Failed to parse JSON data:', error);
            throw new Error('Invalid JSON data');
        }
    }
  };
  