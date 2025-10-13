## API Usage

This project now includes an API for managing `exp.env` and `config_map.json`.

```bash
npm start
```

### Endpoints

#### 1. Modify `exp.env`

- **URL:** `/api/env`
- **Method:** `POST`
- **Content-Type:** `application/json`
- **Body:**
  ```json
  {
    "key": "YOUR_ENV_KEY",
    "value": "YOUR_ENV_VALUE"
  }
  ```
- **Description:** Updates or adds a key-value pair in the `exp.env` file.

#### 2. Import `config_map.json`

- **URL:** `/api/config_map`
- **Method:** `POST`
- **Content-Type:** `application/json`
- **Body:** (Your new `config_map.json` content)
  ```json
  {
    "device1": {
      "type": "light",
      "address": "01"
    },
    "device2": {
      "type": "fan",
      "address": "02"
    }
  }
  ```
- **Description:** Overwrites the entire `config_map.json` file with the provided JSON data.

## 使用 PM2 管理運行

pm2 start ecosystem.config.js --env production

### windows PM2

1. 在 CMD 或 PowerShell (以系統管理員身份運行) 中執行
   npm install pm2-windows-startup -g
2. 儲存當前所有 PM2 正在運行的程序
   pm2 save
3. 在 CMD 或 PowerShell (以系統管理員身份運行) 中執行
   pm2-startup install
4. 移除自動啟動服務: pm2-startup uninstall
