import cluster from "cluster";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
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

  // Set up TURN server with better error handling
  try {
    const server = new Turn({
      authMech: "long-term",
      listeningPort: 3478,
      credentials: {
        username: "password",
      },
    });

    server.on("error", (err) => {
      console.error("TURN server error:", err);
    });

    server.on("relay", (data) => {
      console.log("Relay request:", data);
    });

    server.start();
    console.log("TURN server started successfully on port 3478");
  } catch (error) {
    console.error("Failed to start TURN server:", error);
  }

  // Set up authentication
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

  let httpServer: http.Server | https.Server;

  // Try to use HTTPS if certificates exist, otherwise fall back to HTTP
  try {
    // Check if certificate files exist before trying to read them
    const keyPath = path.join(__dirname, "security/key.pem");
    const certPath = path.join(__dirname, "security/cert.pem");

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
      httpServer = https.createServer(httpsOptions, app);
      console.log("HTTPS server created successfully");
    } else {
      throw new Error("SSL certificate files not found");
    }
  } catch (error) {
    console.error("Error creating HTTPS server:", error);
    console.log("Falling back to HTTP (WebRTC may not work on mobile devices)");
    httpServer = http.createServer(app);

    // Update WebRTC config to include more TURN servers for HTTP fallback
    const additionalServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      {
        urls: ENV.ICE_SERVER_URL,
        credential: "password",
        username: "username",
      },
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
    ];

    // Add each server individually using for...of instead of forEach
    for (const server of additionalServers) {
      webrtcManager.addIceServer(server);
    }

    console.log("Added additional ICE servers for HTTP mode");
  }

  // Set up middleware and routes
  app.use(express.static(path.join(__dirname, "public")));
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));

  // Add middleware to force HTTPS in production
  if (ENV.NODE_ENV === "production") {
    app.use((req, res, next) => {
      if (req.headers["x-forwarded-proto"] !== "https") {
        return res.redirect(`https://${req.headers.host}${req.url}`);
      }
      next();
    });
  }

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
    // Pass the protocol to the client
    const protocol = req.secure ? "https" : "http";
    res.render("client", {
      LIVE_SERVER_URL: ENV.LIVE_SERVER_URL,
      type: RoomType,
      protocol: protocol,
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

  // Connect socket manager
  socketManager.connect(httpServer);

  // Start the server
  httpServer.listen(ENV.SOCKET_PORT, () => {
    console.log(`Server started on port ${ENV.SOCKET_PORT}`);
    console.log(`Server running in ${ENV.NODE_ENV} mode`);
    console.log(
      `Using ${httpServer instanceof https.Server ? "HTTPS" : "HTTP"}`,
    );
    console.log(
      `ICE Servers configured: ${
        webrtcManager.getRtcConfig().iceServers?.length || 0
      }`,
    );
  });
}
