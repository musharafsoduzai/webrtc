import { ENV } from "../constants/environments";

class WebrtcManager {
  rtcConfig: RTCConfiguration = {
    iceServers: [
      {
        urls: [ENV.ICE_SERVER_URL],
        credential: "password",
        username: "username",
      },
      {
        urls: ENV.ICE_SERVER_URL,
        credential: "password",
        username: "username",
      },
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: "all",
  };

  getRtcConfig() {
    return this.rtcConfig;
  }

  updateIceServers(servers: RTCIceServer[]) {
    this.rtcConfig.iceServers = servers;
  }

  addIceServer(server: RTCIceServer) {
    this.rtcConfig?.iceServers?.push(server);
  }

  removeIceServer(index: number) {
    this.rtcConfig?.iceServers?.splice(index, 1);
  }

  updateIceServer(index: number, server: RTCIceServer) {
    if (this.rtcConfig?.iceServers) {
      this.rtcConfig.iceServers[index] = server;
    }
  }

  setRtcConfig(config: RTCConfiguration) {
    this.rtcConfig = config;
    return this.rtcConfig;
  }
}

export default new WebrtcManager();
