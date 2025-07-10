Run with Command line
1. npx app start -c <path> 'Path to config file'

Auto start with pm2
1. install pm2
2. cd <path to VEGA_SDK>
3. 開啟生產模式 pm2 start ecosystem.config.js -c config.js --env production

## API Usage

This project now includes an API for managing `exp.env` and `config_map.json`.

### Starting the API Server

The API server runs on port 3000 by default, or the port specified in the `API_PORT` environment variable in `exp.env`.

To start the API server, ensure `api.js` is included in `index.js` (which it is by default after this update), and then run the main application:

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
