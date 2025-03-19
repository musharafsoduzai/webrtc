import { ENV } from "../constants/environments";

class WebrtcManager {
  rtcConfig: RTCConfiguration = {
    iceServers: [
      {
        urls: ["stun:stun.l.google.com:19302"],
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

  /**
   * Media constraints for WebRTC connections
   */
  mediaConstraints: MediaStreamConstraints = {
    video: {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 60 },
      facingMode: { ideal: "user" }, // Ensure front camera is used
      aspectRatio: { ideal: 16 / 9 },
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
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
