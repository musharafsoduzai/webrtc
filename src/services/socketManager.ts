import type http from "node:http";
import { Server, type Socket } from "socket.io";
import type { RoomType } from "./../services/roomManager";
import { SocketEvents } from "./../types/SocketEvents";
import { userManager } from "./userManager";
import webrtcManager from "./webrtcManager";

export type Status = { cameraOn: boolean; audioOn: boolean };

class SocketManager {
  io!: Server;

  connect(httpServer: http.Server) {
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
      },
    });
    this.io.on(SocketEvents.CONNECTION, (socket: Socket) => {
      this.onConnection(socket);
      this.listenForJoinEvent(socket);
      this.listenForLeaveEvent(socket);
      this.listenForDisconnectEvent(socket);
      this.listenForSignalingEvents(socket);
      this.listenForStatusUpdate(socket);
      this.listenForMessageEvent(socket);
    });
  }

  onConnection(socket: Socket) {
    socket.emit("updateIceServers", webrtcManager.getRtcConfig().iceServers);
    userManager.onUserConnected(socket);
  }

  listenForSignalingEvents(socket: Socket) {
    socket.on(SocketEvents.RTC_OFFER, ({ offer }) => {
      userManager.onWebrtcOfferReceived(socket, offer);
    });

    socket.on(SocketEvents.RTC_ANSWER, ({ answer }) => {
      userManager.onWebrtcAnswerReceived(socket, answer);
    });

    socket.on(SocketEvents.RTC_CANDIDATE, ({ candidate }) => {
      userManager.onWebrtcCandidateReceived(socket, candidate);
    });

    socket.on(SocketEvents.SIGNAL, (signal: unknown) => {
      userManager.onSignalReceived(socket, signal);
    });
  }

  listenForJoinEvent(socket: Socket) {
    socket.on(
      SocketEvents.ROOM_JOIN,
      ({ roomType }: { roomType: RoomType }) => {
        userManager.onRoomJoin(socket, roomType);
      },
    );
  }

  listenForMessageEvent(socket: Socket) {
    socket.on(SocketEvents.MESSAGE_SEND, ({ message }: { message: string }) => {
      userManager.onMessageReceived(socket, message);
    });
  }

  listenForStatusUpdate(socket: Socket) {
    socket.on(SocketEvents.STATUS_UPDATE, (status: Status) => {
      userManager.onStatusUpdate(socket, status);
    });
  }

  listenForLeaveEvent(socket: Socket) {
    socket.on(SocketEvents.ROOM_LEAVE, () => {
      userManager.onRoomLeave(socket);
    });
  }

  listenForDisconnectEvent(socket: Socket) {
    socket.on(SocketEvents.DISCONNECT, () => {
      userManager.onDisconnect(socket);
    });
  }
}

export default new SocketManager();
