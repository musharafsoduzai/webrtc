# Use official Node.js runtime as base image
FROM node:18-alpine
# Set working directory in container
WORKDIR /app
# Copy package.json and package-lock.json
COPY package*.json ./
# Install dependencies
RUN npm install
# Copy the rest of the application
COPY . .
ENV SOCKET_PORT=5000
ENV MONITORING_PASSWORD=root
ENV MONITORING_USERNAME=root
ENV LIVE_SERVER_URL=https://dev.specterman.io/specter/live
ENV ICE_SERVER_URL=turn:35.183.200.31:3478
# Expose port 3000
EXPOSE 5000
# Command to run the application
CMD ["npm", "start"]