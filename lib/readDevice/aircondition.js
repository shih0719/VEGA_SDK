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
                if (key === 'model') {
                    switch(rs[key]){
                        case 'cold':
                        rs.model = 0;
                        break;
                        case 'heat':
                        rs.model = 1;
                        break;
                        case 'fan':
                        rs.model = 2;
                        break;
                    }
                }else if(key ==='rev_speed'){
                    switch(rs[key]){
                        case 'auto':
                    rs.rev_speed = 0;
                    break;
                case 'low':
                    rs.rev_speed = 1;
                    break;
                case 'middle':
                    rs.rev_speed = 2;
                    break;
                case 'high':
                    rs.rev_speed = 3;
                    break;
                    }
                }
                else if(key ==='temperature'){
                    rs.temperature = rs.temperature * 10;
                }
                else if(key ==='power_on'){
                    rs.power_on = rs.power_on ? 1 : 0;
                }
        }
            return rs;
        }catch (error) {
            console.error('Failed to parse JSON data:', error);
            return {};
        }
    }
  };
  