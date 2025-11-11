# 使用官方 Node.js 運行時作為基礎映像
FROM node:18-alpine

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安裝依賴項目（只安裝生產環境的依賴）
RUN npm ci --only=production

# 複製應用程式代碼
COPY . .

# 創建必要的目錄
RUN mkdir -p logs data

# 設定環境變數
ENV NODE_ENV=production

# 暴露 Modbus TCP 端口
EXPOSE 502

# 建立非 root 用戶（提升安全性）
RUN addgroup -g 1001 -S nodejs && \
    adduser -S vega -u 1001 -G nodejs

# 變更檔案所有權
RUN chown -R vega:nodejs /app

# 切換到非 root 用戶
USER vega

# 健康檢查（可選）
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

# 定義啟動命令
CMD ["node", "index.js"]