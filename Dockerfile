FROM node:22-slim
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
COPY server/ ./server/
COPY superskills/ ./superskills/
COPY core/ ./core/
COPY config.json ./
COPY project-context/ ./project-context/
COPY ui-dist/ ./ui-dist/
EXPOSE 3456
CMD ["node", "server/server.js"]