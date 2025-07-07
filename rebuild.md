VEGA SDK 重構設計文檔

經過檢查，發現專案存在以下主要問題：

程式碼品質：
Logger 類別未被充分使用
錯誤處理不完整，大多使用 console.log
utils.js 中 SameKeytoMap 函數有不可達代碼
遺留的註解掉的 console.log 語句
連接管理：
MQTT 重連機制需要改進
Modbus 連接缺乏重試機制
stopMQTT 和 stopModbus 缺乏完整資源清理
配置和安全：
敏感資訊直接寫在配置檔案中
缺乏環境變量支持
MQTT 連接未使用 SSL/TLS
缺乏輸入驗證
測試不足：
僅有簡單功能測試
缺乏單元測試和整合測試
未考慮邊界條件測試
設備邏輯處理：
錯誤處理不一致（返回 {} vs null）
數值轉換缺乏範圍檢查
枚舉值使用硬編碼
擴展性：
設備類型硬編碼在配置中
缺乏插件機制
難以動態更新配置
監控診斷：
缺乏系統狀態監控
無遠程診斷功能
缺乏性能指標收集
文檔：
README.md 過於簡單
缺乏 API 文檔和配置說明
缺乏故障排除指南

1. 系統架構
   訂閱/發布

讀寫暫存器

CLI Interface

Core Service

MQTT Service

Modbus Service

Device Manager

Config Manager

Device Logic

MQTT Broker

Modbus Client

Configuration Files

Logger Service

2. 核心類設計
   2.1 設備邏輯層
   «interface»

IDeviceLogic

+read(data: string) : : Record

+write(channel: string, value: number) : : object

«abstract»

BaseDeviceLogic

#validateData(data: string) : : boolean

#parseJSON(data: string) : : object

#transformRead(data: object) : : Record

#transformWrite(channel: string, value: number) : : object

SwitchLogic

+read(data: string)

+write(channel: string, value: number)

PanelLogic

+read(data: string)

+write(channel: string, value: number)

AirConditionLogic

+read(data: string)

+write(channel: string, value: number)

2.2 服務層
«interface»

IService

+start() : : void

+stop() : : void

+isRunning() : : boolean

MQTTService

-client: MQTTClient

-config: MQTTConfig

+subscribe(topic: string)

+publish(topic: string, message: string)

-handleConnection()

-handleMessage()

ModbusService

-server: ModbusServer

-registers: Map

+getRegister(addr: number)

+setRegister(addr: number, value: number)

-handleRequest()

CoreService

-mqttService: MQTTService

-modbusService: ModbusService

-deviceManager: DeviceManager

+start()

+stop()

2.3 配置管理
«interface»

IConfig

+validate() : : boolean

MQTTConfig

+url: string

+options: object

+validate()

ModbusConfig

+host: string

+port: number

+validate()

DeviceConfig

+type: string

+channels: Map

+validate()

ConfigManager

+loadConfig(path: string)

+validateConfig()

+getConfig() : : Config

3. 錯誤處理系統
   «abstract»

BaseError

+message: string

+code: number

+timestamp: Date

DeviceError

+deviceType: string

ServiceError

+serviceName: string

ConfigError

+configPath: string

4. 實現計劃
   階段一：基礎設施（2 天）
   實現錯誤處理系統
   建立日誌系統
   創建基礎測試框架
   階段二：設備邏輯層（3 天）
   實現 BaseDeviceLogic
   重構現有設備邏輯
   添加單元測試
   階段三：服務層（4 天）
   分離 MQTT 服務
   分離 Modbus 服務
   實現 CoreService
   添加服務測試
   階段四：配置管理（2 天）
   實現配置驗證
   改進配置載入機制
   添加配置測試
   階段五：CLI 改進（2 天）
   重構命令處理
   添加新功能
   改進錯誤處理
5. 技術規範
   代碼風格

使用 TypeScript
遵循 ESLint 規則
使用 Prettier 格式化
測試要求

單元測試覆蓋率 > 80%
集成測試覆蓋關鍵路徑
使用 Jest 測試框架
文檔要求

所有公共 API 必須有 JSDoc
必須包含使用示例
提供 Changelog
