
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV SOCKET_PORT=5000
ENV MONITORING_PASSWORD=root
ENV MONITORING_USERNAME=root
ENV LIVE_SERVER_URL=https://dev.specterman.io/specter/live
ENV ICE_SERVER_URL=turn:35.183.200.31:3478
EXPOSE 5000
CMD ["npm", "start"]