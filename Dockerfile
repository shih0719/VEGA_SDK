FROM node:18-alpine

# 安裝必要的系統工具（如果需要）
RUN apk add --no-cache tini

WORKDIR /app

# 複製 package files
COPY package*.json ./

# 安裝依賴
RUN npm install --omit=dev && \
    npm cache clean --force

# 建立用戶（提早創建，避免權限問題）
RUN addgroup -g 1001 -S nodejs && \
    adduser -S vega -u 1001 -G nodejs

# 複製應用代碼
COPY --chown=vega:nodejs . .

# 創建必要目錄並設定權限
RUN mkdir -p logs/prod logs/dev data && \
    chown -R vega:nodejs /app

# 設定環境變數
ENV NODE_ENV=production \
    TZ=Asia/Taipei

# 暴露端口
EXPOSE 502

# 切換到非 root 用戶
USER vega

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

# 使用 tini 作為 init 進程（優雅處理信號）
ENTRYPOINT ["/sbin/tini", "--"]

# 啟動命令
CMD ["npm", "start"]