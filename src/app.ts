import cluster from "cluster";
import http from "node:http";
import path from "node:path";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import auth from "http-auth";
import Turn from "node-turn";
import { ENV } from "./constants/environments";
import { users } from "./models/Users";
import { RoomType, rooms } from "./services/roomManager";
import socketManager from "./services/socketManager";
import webrtcManager from "./services/webrtcManager";
import https from "https";
import fs from "fs";

if (cluster.isPrimary) {
  console.log(`Primary process ${process.pid} is running`);
  cluster.fork();
  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Spawning a new worker...`);
    cluster.fork();
  });
} else {
  startMainApp();
}

function startMainApp() {
  const app = express();
  const server = new Turn({
    authMech: "long-term",
    listeningPort: 3478,
    credentials: {
      username: "password",
    },
  });
  server.on("relay", (data) => {
    console.log("Relay request:", data);
  });
  server.start();
  const basic = auth.basic(
    { realm: "Monitor Area" },
    (user, pass, callback) => {
      callback(
        user === ENV.MONITORING_USERNAME && pass === ENV.MONITORING_PASSWORD,
      );
    },
  );
  const monitorAuthMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    basic.check((isAuthenticated) => {
      if (!isAuthenticated) {
        res.set("WWW-Authenticate", basic.generateHeader());
        return res.status(401).send("Unauthorized");
      }
      next();
    })(req, res);
  };
  
  let httpServer;
  
  // Try to use HTTPS if certificates exist, otherwise fall back to HTTP
  try {
    const httpsOptions = {
      key: fs.readFileSync(path.join(__dirname, 'security/key.pem')),
      cert: fs.readFileSync(path.join(__dirname, 'security/cert.pem'))
    };
    httpServer = https.createServer(httpsOptions, app);
    console.log("HTTPS server created successfully");
  } catch (error) {
    console.log("SSL certificates not found, falling back to HTTP (WebRTC may not work on mobile devices)");
    httpServer = http.createServer(app);
  }

  app.use(express.static(path.join(__dirname, "public")));
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));
  app.get("/", monitorAuthMiddleware, (req, res) => {
    res.render("index");
  });

  app.get("/ice-monitoring", monitorAuthMiddleware, (req, res) => {
    res.render("ice-servers");
  });

  app.get("/api/ice-servers", (req, res) => {
    res.json(webrtcManager.getRtcConfig().iceServers);
  });

  app.post("/api/ice-servers", express.json(), (req, res) => {
    const newServer = req.body;
    webrtcManager.addIceServer(newServer);
    socketManager.io.emit(
      "updateIceServers",
      webrtcManager.getRtcConfig().iceServers,
    );
    res.status(201).json({ success: true });
  });

  app.delete("/api/ice-servers/:index", (req, res) => {
    const index = Number.parseInt(req.params.index, 10);
    webrtcManager.removeIceServer(index);
    socketManager.io.emit(
      "updateIceServers",
      webrtcManager.getRtcConfig().iceServers,
    );
    res.json({ success: true });
  });

  app.put("/api/ice-servers/:index", express.json(), (req, res) => {
    const index = Number.parseInt(req.params.index, 10);
    webrtcManager.updateIceServer(index, req.body);
    socketManager.io.emit(
      "updateIceServers",
      webrtcManager.getRtcConfig().iceServers,
    );
    res.json({ success: true });
  });

  app.get("/health", (_, res) => {
    res.json({ status: "ok" });
  });

  app.get("/client", monitorAuthMiddleware, (req, res) => {
    res.render("client", {
      LIVE_SERVER_URL: ENV.LIVE_SERVER_URL,
      type: RoomType,
    });
  });
  app.get("/monitor", monitorAuthMiddleware, (req, res) => {
    const allRooms = Array.from(rooms.rooms.values()).map((room) => {
      const participants = Array.from(room.participants).map((socketId) => {
        const user = users.getUserBySocketId(socketId);
        return {
          socketId,
          username: user?.username || "Anonymous",
          gender: user?.gender || "Unknown",
        };
      });

      return {
        id: room.id,
        type: room.type,
        maxParticipants: room.maxParticipants,
        participants,
      };
    });

    res.render("rooms", { rooms: allRooms });
  });
  socketManager.connect(httpServer);

  httpServer.listen(ENV.SOCKET_PORT, () => {
    console.log(`Server started on port ${ENV.SOCKET_PORT}`);
  });
}
