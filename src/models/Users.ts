import { z } from "zod";
import type { Status } from "../services/socketManager";

export const userSchema = z.object({
  id: z.number(),
  gender: z.enum(["male", "female"]),
  room: z.string().optional(),
  socketID: z.string(),
  username: z.string(),
  isMobile: z.boolean(),
  cameraOn: z.boolean(),
  audioOn: z.boolean(),
});

export type User = z.infer<typeof userSchema>;

export class UserModel {
  private users: Map<string, User> = new Map();

  addUser(newUser: User) {
    const oldUser =
      this.getUserBySocketId(newUser.socketID) ?? this.getUserById(newUser.id);
    if (oldUser) {
      this.users.delete(oldUser.socketID);
      console.log("oldUser deleted:", oldUser.id);
    }

    this.users.set(newUser.socketID, newUser);
    console.log("New user Added:", newUser.id);
  }

  removeUser(socketId: string) {
    this.users.delete(socketId);
  }

  getUserBySocketId(socketId: string): User | undefined {
    return this.users.get(socketId);
  }

  getUserById(id: number): User | undefined {
    return Array.from(this.users.values()).find((user) => user.id === id);
  }

  getUsersByGender(gender: User["gender"]): User[] {
    return Array.from(this.users.values()).filter(
      (user) => user.gender === gender,
    );
  }
  updateUserStatusBySocketId(socketId: string, status: Status) {
    const user = this.users.get(socketId);
    if (!user) return;
    user.audioOn = status.audioOn;
    user.cameraOn = status.cameraOn;
    this.users.set(socketId, user);
    return user;
  }
}

export const users = new UserModel();
