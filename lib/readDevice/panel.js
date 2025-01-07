module.exports = {
    execute(data) {
        try{
            const jsonData = JSON.parse(data); // 將 JSON 字符串轉換為對象
            const func = jsonData?.function;
            if(!func){
                return null;
            }
            let rs = func;
            for (const key in rs) {
                if (key === 'switch_ch1') {
                    rs[key] = rs[key] ? 1 : 0;
                }else if(key ==='button_id'){
                    rs[key] = rs[key] *10;
                }
            }
            return rs;
        }catch (error) {
            console.error('Failed to parse JSON data:', error);
            return {};
        }
    }
  };
  