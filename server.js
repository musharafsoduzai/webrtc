require("dotenv").config();
const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { v4: uuidv4 } = require("uuid");

// Set EJS as the view engine
app.set("view engine", "ejs");
app.use(express.static("public"));

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/room", (req, res) => {
  res.redirect(`/room/${uuidv4()}`);
});

app.get("/room/:roomId", (req, res) => {
  res.render("room", { roomId: req.params.roomId });
});

// Socket.io connection handling
io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-connected", userId);

    socket.on("disconnect", () => {
      socket.to(roomId).emit("user-disconnected", userId);
    });
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
