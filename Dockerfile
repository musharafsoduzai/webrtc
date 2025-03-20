# Use an official lightweight Node.js image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application files
COPY . .

# Ensure the security folder containing SSL certificates is available
RUN mkdir -p /app/security

# Set environment variables
ENV SOCKET_PORT=5000 \
    MONITORING_PASSWORD=root \
    MONITORING_USERNAME=root \
    LIVE_SERVER_URL=https://dev.specterman.io/specter/live \
    ICE_SERVER_URL=turn:35.183.200.31:3478

# Expose the WebRTC server port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
