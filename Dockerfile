FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire project (including the security folder)
COPY . .

# Explicitly copy the security folder from src/
COPY src/security /app/security

# Ensure the security folder exists inside the container
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
