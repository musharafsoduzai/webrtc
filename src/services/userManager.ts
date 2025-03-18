import type { Socket } from "socket.io";
import { userSchema, users } from "../models/Users";
import { SocketEvents } from "../types/SocketEvents";
import { type RoomType, rooms } from "./roomManager";
import socketManager, { type Status } from "./socketManager";

function onUserConnected(socket: Socket) {
  console.log(`User connected: ${socket.id}`);
  const { id, gender, username, isMobile, cameraOn, audioOn } =
    socket.handshake.query ?? {};
  const parsedUser = userSchema.safeParse({
    id: Number(id),
    gender,
    room: undefined,
    socketID: socket.id,
    username,
    isMobile:
      isMobile === "true" ? true : isMobile === "false" ? false : isMobile,
    cameraOn: true,
    audioOn: true,
  });
  if (!parsedUser.success) {
    console.log(
      `User ${socket.id} failed to connect: ${JSON.stringify(
        parsedUser.error.flatten(),
      )}`,
    );
    socket.emit(SocketEvents.ERROR, parsedUser.error.flatten());
    return socket.disconnect();
  }
  users.addUser(parsedUser.data);
}

function onRoomJoin(socket: Socket, roomType: RoomType) {
  const user = users.getUserBySocketId(socket.id);
  if (!user) {
    socket.emit(
      SocketEvents.ERROR,
      "User not initialized. Call reconnect with correct data first.",
    );
    return socket.disconnect();
  }

  const room = rooms.joinRoom(socket, roomType, user);
  socketManager.io.to(room.id).emit(SocketEvents.USER_JOINED, {
    socketId: socket.id,
    username: user.username,
    gender: user.gender,
    roomId: room.id,
    participants: rooms.getRoomUsers(room.id),
  });
  console.log(`User ${socket.id} joined room ${room.id}`);
  rooms.startRoom(room.id);
}

function onRoomLeave(socket: Socket) {
  try {
    const room = rooms.getUserRoomBySocketId(socket.id);
    rooms.leaveAllRooms(socket);
    if (!room?.id) {
      console.log("User is not in a room.");
      return;
    }

    socketManager.io.to(room.id).emit(SocketEvents.USER_LEFT, {
      socketId: socket.id,
    });

    // only 1 user left in the room, join them to another room.
    if (room.participants.size === 1) {
      for (const participantSocketId of room.participants) {
        const room = rooms.getUserRoomBySocketId(participantSocketId);
        const socket =
          socketManager.io.sockets.sockets.get(participantSocketId);
        if (!socket) return console.warn("socket not found");
        if (!room) return console.warn("room not found");
        rooms.leaveAllRooms(socket);
        console.log("joining to another room:", socket.id, room.type);
        onRoomJoin(socket, room.type);
      }
    }

    console.log(`User ${socket.id} left room ${room.id}`);
    console.log("joining to another room:", socket.id, room.type);
    onRoomJoin(socket, room.type);
  } catch (err) {
    if (typeof err === "object" && err && "message" in err) {
      console.error(err.message);
      socket.emit(SocketEvents.ERROR, {
        message: err.message || "Failed to leave the room",
      });
    }
  }
}

function onMessageReceived(socket: Socket, message: string) {
  console.log(`received a message from ${socket.id}: ${message}`);
  const user = users.getUserBySocketId(socket.id);
  const roomId = user?.room;
  if (!user || !roomId) return;
  rooms.addMessage(roomId, user, message);
}

function onSignalReceived(socket: Socket, signal: unknown) {
  console.log(`received a signal from ${socket.id}: ${signal}`);
  const roomId = rooms.getUserRoomBySocketId(socket.id)?.id;
  if (!roomId) return;
  socket.to(roomId).emit(SocketEvents.SIGNAL, signal);
}

function onWebrtcAnswerReceived(socket: Socket, answer: string) {
  const user = users.getUserBySocketId(socket.id);
  if (!user) {
    socket.emit(
      SocketEvents.ERROR,
      "User not initialized. Call reconnect with correct data first.",
    );
    return socket.disconnect();
  }
  if (!user.room) {
    socket.emit(SocketEvents.ERROR, "User is not in a room.");
    return socket.disconnect();
  }
  const userRoom = user.room;
  socket.to(userRoom).emit(SocketEvents.RTC_ANSWER, {
    answer,
  });
}

function onWebrtcCandidateReceived(
  socket: Socket,
  candidate: RTCIceCandidateInit,
) {
  const user = users.getUserBySocketId(socket.id);
  if (!user) {
    socket.emit(
      SocketEvents.ERROR,
      "User not initialized. Call reconnect with correct data first.",
    );
    return socket.disconnect();
  }
  if (!user.room) {
    socket.emit(SocketEvents.ERROR, "User is not in a room.");
    return socket.disconnect();
  }
  const userRoom = user.room;
  socket.to(userRoom).emit(SocketEvents.RTC_CANDIDATE, {
    candidate,
  });
}

function onWebrtcOfferReceived(socket: Socket, offer: string) {
  const user = users.getUserBySocketId(socket.id);

  if (!user) {
    socket.emit(
      SocketEvents.ERROR,
      "User not initialized. Call reconnect with correct data first.",
    );
    return socket.disconnect();
  }
  if (!user.room) {
    socket.emit(SocketEvents.ERROR, "User is not in a room.");
    return socket.disconnect();
  }
  const userRoom = user.room;
  socket.to(userRoom).emit(SocketEvents.RTC_OFFER, {
    offer,
  });
}

function onStatusUpdate(socket: Socket, status: Status) {
  console.log(`Status update from ${socket.id}:`, status);
  const user = users.updateUserStatusBySocketId(socket.id, status);
  const roomId = user?.room;
  if (!roomId) return;
  const roomUsers = rooms.getRoomUsers(roomId);
  if (!roomUsers) return;
  socket
    .to(roomId)
    .emit(SocketEvents.STATUS_UPDATE, { userId: user.id, roomUsers });
}

function onDisconnect(socket: Socket) {
  try {
    const room = rooms.getUserRoomBySocketId(socket.id);
    rooms.leaveAllRooms(socket);
    users.removeUser(socket.id);
    if (!room?.id) {
      console.log("User is not in a room.");
      return;
    }

    socketManager.io.to(room.id).emit(SocketEvents.USER_LEFT, {
      socketId: socket.id,
    });

    // only 1 user left in the room, join them to another room.
    if (room.participants.size === 1) {
      for (const participantSocketId of room.participants) {
        const room = rooms.getUserRoomBySocketId(participantSocketId);
        const socket =
          socketManager.io.sockets.sockets.get(participantSocketId);
        if (!socket) return console.warn("socket not found");
        if (!room) return console.warn("room not found");
        rooms.leaveAllRooms(socket);
        console.log("joining to another room:", socket.id, room.type);
        onRoomJoin(socket, room.type);
      }
    }

    console.log(`User ${socket.id} disconnected`);
  } catch (err) {
    if (typeof err === "object" && err && "message" in err) {
      console.error(
        `Error during disconnect for user ${socket.id}: ${err.message}`,
      );
    }
  }
}

export const userManager = {
  onUserConnected,
  onRoomJoin,
  onRoomLeave,
  onDisconnect,
  onWebrtcOfferReceived,
  onWebrtcAnswerReceived,
  onWebrtcCandidateReceived,
  onMessageReceived,
  onStatusUpdate,
  onSignalReceived,
};
