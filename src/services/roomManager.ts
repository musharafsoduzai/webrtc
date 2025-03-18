import type { Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { type User, users } from "../models/Users";
import { SocketEvents } from "../types/SocketEvents";
import socketManager from "./socketManager";
import webrtcManager from "./webrtcManager";

//TODO: handle wrong parameter when joining rooms

export interface RoomOptions {
  id: string;
  type: RoomType;
  maxParticipants: number;
}

export enum RoomType {
  FRIEND_ZONE = "friend-zone",
  PROPAGATION = "propagation", // gender filter
}

const ROOM_MESSAGE_MAX_LENGTH = 200;

type Message = {
  value: string;
  userId: User["id"];
  username: User["username"];
};

export class Room {
  id: string;
  type: RoomType;
  participants: Set<string>;
  maxParticipants: number;
  messages: Message[];

  constructor({ id, type, maxParticipants }: RoomOptions) {
    this.id = id;
    this.type = type;
    this.maxParticipants = maxParticipants;
    this.participants = new Set();
    this.messages = [];
  }

  canJoin(): boolean {
    return this.participants.size < this.maxParticipants;
  }

  addParticipant(socketId: string): boolean {
    if (!this.canJoin()) return false;
    this.participants.add(socketId);
    return true;
  }

  removeParticipant(socketId: string): void {
    this.participants.delete(socketId);
  }

  isEmpty(): boolean {
    return this.participants.size === 0;
  }

  userExists(socketId: string): boolean {
    return this.participants.has(socketId);
  }
  addMessage = (message: Message) => {
    this.messages.push({
      ...message,
      value: message.value.substring(0, ROOM_MESSAGE_MAX_LENGTH),
    });
  };
  getMessages = () => this.messages;
}

class RoomManager {
  public rooms: Map<string, Room> = new Map();

  createRoom(type: RoomType, maxParticipants = 2): Room {
    const roomId = uuidv4();
    const room = new Room({ id: roomId, type, maxParticipants });
    this.rooms.set(roomId, room);
    return room;
  }

  private isRoomCompatible(
    room: Room,
    userGender: string,
    roomType: RoomType,
  ): boolean {
    if (roomType === RoomType.FRIEND_ZONE) {
      return true;
    }
    if (roomType === RoomType.PROPAGATION) {
      for (const participantId of room.participants) {
        const participant = users.getUserBySocketId(participantId);
        if (participant?.gender !== userGender) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  findCompatibleRoom(type: RoomType, userGender: string): Room | null {
    for (const room of this.rooms.values()) {
      this.removeAnonymousUsers(room);
      if (room.isEmpty()) {
        this.rooms.delete(room.id);
        continue;
      }
      if (
        room.type === type &&
        room.canJoin() &&
        this.isRoomCompatible(room, userGender, type)
      ) {
        return room;
      }
    }
    return null;
  }

  removeAnonymousUsers(room: Room) {
    for (const socketId of room.participants) {
      const _user = users.getUserBySocketId(socketId);
      if (!_user || _user.id === undefined) {
        room.removeParticipant(socketId);
      }
    }
  }

  getUserRoomBySocketId(socketId: string) {
    return Array.from(this.rooms.values()).find((room) =>
      room.userExists(socketId),
    );
  }

  joinRoom(socket: Socket, type: RoomType, user: User): Room {
    // leave room if already joined one.
    if (user.room) {
      this.leaveRoom(user.room, socket);
    }
    let room = this.findCompatibleRoom(type, user.gender);

    if (!room) room = this.createRoom(type);

    room.addParticipant(socket.id);
    user.room = room.id;
    socket.join(room.id);
    return room;
  }

  startRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    console.log(
      `Try to start a room with ${room.participants.size} participants`,
    );

    if (room.participants.size >= 2) {
      // Enhanced WebRTC configuration with cross-platform compatibility
      const config = webrtcManager.getRtcConfig();

      console.log(
        `Sent start room event to ${roomId} with ${room.participants.size} participants`,
        JSON.stringify(config),
      );

      // Send the enhanced config to all participants
      socketManager.io.to(roomId).emit(SocketEvents.ROOM_START, config);

      // Increased timeout to ensure devices are ready before initiating offer
      setTimeout(() => {
        const participants = Array.from(room.participants);
        // Send offer request to the first participant
        socketManager.io.to(participants[0]).emit(SocketEvents.ROOM_OFFER);

        console.log(`Sent offer request to participant: ${participants[0]}`);
      }, 3000); // Increased to 3000ms for better cross-device compatibility
    }
  }

  leaveAllRooms(socket: Socket): string | null {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.participants.has(socket.id)) {
        this.leaveRoom(roomId, socket);
      }
    }
    return null;
  }

  leaveRoom(roomId: string, socket: Socket) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }
    const user = users.getUserBySocketId(socket.id);
    if (user) user.room = undefined;

    room.removeParticipant(socket.id);
    socket.leave(room.id);
    if (room.isEmpty()) {
      this.rooms.delete(room.id);
    }
    return room.id;
  }

  addMessage(roomId: string, sender: User, message: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.addMessage({
      value: message,
      userId: sender.id,
      username: sender.username,
    });
    const messages = room.getMessages();
    socketManager.io.to(roomId).emit(SocketEvents.MESSAGE_RECEIVE, messages);
  }
  getRoomUsers(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const roomUsers = Array.from(room.participants)
      .map((participantId) => users.getUserBySocketId(participantId))
      .filter((user) => !!user);
    return roomUsers;
  }
}

export const rooms = new RoomManager();
