FROM node:18-alpine

WORKDIR /app

# 複製 package files
COPY package*.json ./

# 安裝依賴
RUN npm ci --omit=dev

# 複製應用代碼
COPY . .

# 創建必要目錄
RUN mkdir -p logs/prod logs/dev data

# 設定環境變數
ENV NODE_ENV=production

# 暴露端口
EXPOSE 502

# 建立用戶
RUN addgroup -g 1001 -S nodejs && \
    adduser -S vega -u 1001 -G nodejs

# 設定權限
RUN chown -R vega:nodejs /app
USER vega

# 啟動命令
CMD ["npm", "start"]