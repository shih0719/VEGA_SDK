FROM node:18-alpine

# 安裝必要的系統工具（如果需要）
RUN apk add --no-cache tini su-exec

WORKDIR /app

# 複製 package files
COPY package*.json ./

# 安裝依賴
RUN npm install --omit=dev && \
    npm cache clean --force

# 建立用戶（提早創建，避免權限問題）
RUN addgroup -g 1001 -S nodejs && \
    adduser -S vega -u 1001 -G nodejs

# 確保所有必要目錄存在（重要！）
RUN mkdir -p /app/configs \
             /app/logs/prod \
             /app/logs/dev \
             /app/data && \
    chown -R vega:nodejs /app

# 複製應用代碼
COPY --chown=vega:nodejs . .

# 創建必要目錄並設定權限
RUN mkdir -p logs/prod logs/dev data && \
    chown -R vega:nodejs /app && \
    chmod +x entrypoint.sh

# 設定環境變數
ENV NODE_ENV=production \
    TZ=Asia/Taipei

# 暴露端口
EXPOSE 502

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

# entrypoint 以 root 身分修正掛載的 logs 目錄權限後，再切換到非 root 用戶執行
# 使用 tini 作為 init 進程（優雅處理信號）
ENTRYPOINT ["/sbin/tini", "--", "/app/entrypoint.sh"]

# 啟動命令
CMD ["npm", "start"]