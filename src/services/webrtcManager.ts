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
        urls: ENV.ICE_SERVER_URL,
        credential: "password",
        username: "username",
      },
      // Adding a fallback TURN server for better compatibility
      {
        urls: "turn:global.turn.twilio.com:3478?transport=udp",
        username: "optional_backup_username",
        credential: "optional_backup_credential",
      },
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: "all",
    // Adding additional configuration for better cross-platform compatibility
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
  };

  getRtcConfig() {
    // Add logging to help with debugging
    console.log("Getting RTC config:", JSON.stringify(this.rtcConfig));
    return this.rtcConfig;
  }

  updateIceServers(servers: RTCIceServer[]) {
    this.rtcConfig.iceServers = servers;
    console.log("Updated ICE servers:", JSON.stringify(servers));
  }

  addIceServer(server: RTCIceServer) {
    if (!this.rtcConfig.iceServers) {
      this.rtcConfig.iceServers = [];
    }
    this.rtcConfig.iceServers.push(server);
    console.log("Added ICE server:", JSON.stringify(server));
  }

  removeIceServer(index: number) {
    if (
      this.rtcConfig.iceServers &&
      index >= 0 &&
      index < this.rtcConfig.iceServers.length
    ) {
      this.rtcConfig.iceServers.splice(index, 1);
      console.log("Removed ICE server at index:", index);
    }
  }

  updateIceServer(index: number, server: RTCIceServer) {
    if (
      this.rtcConfig.iceServers &&
      index >= 0 &&
      index < this.rtcConfig.iceServers.length
    ) {
      this.rtcConfig.iceServers[index] = server;
      console.log(
        "Updated ICE server at index:",
        index,
        "with:",
        JSON.stringify(server),
      );
    }
  }

  // New method to get mobile-optimized constraints
  getMobileMediaConstraints() {
    return {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: {
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 15, max: 30 },
      },
    };
  }
}

export default new WebrtcManager();
