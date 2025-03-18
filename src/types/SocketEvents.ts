export enum SocketEvents {
  CONNECTION = "connection",
  DISCONNECT = "disconnect",
  DISCONNECTING = "disconnecting",
  
  ERROR = "error",
  ROOM_JOIN = "room:join",
  ROOM_LEAVE = "room:leave",
  ROOM_START = "room:start",
  ROOM_OFFER = "room:start_offerer",
  USER_JOINED = "user:joined",
  USER_LEFT = "user:left",
  MESSAGE_SEND = "message:send",
  MESSAGE_RECEIVE = "message:receive",

  SIGNAL = "signal",

  STATUS_UPDATE = "status:update",

  RTC_OFFER = "rtc:offer",
  RTC_ANSWER = "rtc:answer",
  RTC_CANDIDATE = "rtc:candidate",
}
