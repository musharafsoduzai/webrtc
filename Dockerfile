FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . .
ENV SOCKET_PORT=5000 \
    MONITORING_PASSWORD=root \
    MONITORING_USERNAME=root \
    LIVE_SERVER_URL=https://dev.specterman.io/specter/live \
    ICE_SERVER_URL=turn:35.183.200.31:3478
EXPOSE 5000
CMD ["npm", "start"]
