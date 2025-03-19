import "dotenv/config";

export const ENV = {
  NODE_ENV: process.env.NODE_ENV,
  SOCKET_PORT: !Number.isNaN(Number(process.env.SOCKET_PORT))
    ? Number(process.env.SOCKET_PORT)
    : 5000,
  MONITORING_PASSWORD: process.env.MONITORING_PASSWORD,
  MONITORING_USERNAME: process.env.MONITORING_USERNAME,
  LIVE_SERVER_URL: process.env.LIVE_SERVER_URL ?? "",
  ICE_SERVER_URL: process.env.ICE_SERVER_URL as string,
};
