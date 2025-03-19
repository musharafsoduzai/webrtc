import { ENV } from "../constants/environments";

class WebrtcManager {
  rtcConfig: RTCConfiguration = {
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
      {
        urls: [ENV.ICE_SERVER_URL],
        credential: "password",
        username: "username",
      },
      // Add additional free TURN servers for better mobile compatibility
      {
        urls: "turn:numb.viagenie.ca",
        credential: "muazkh",
        username: "webrtc@live.com",
      },
      {
        urls: "turn:turn.anyfirewall.com:443?transport=tcp",
        credential: "webrtc",
        username: "webrtc",
      },
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: "all",
    // Add these options for better mobile compatibility
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
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
}

export default new WebrtcManager();
