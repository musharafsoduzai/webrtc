const socket = io("/");
const videoGrid = document.getElementById("videoGrid");
const muteBtn = document.getElementById("muteBtn");
const videoToggleBtn = document.getElementById("videoToggleBtn");
const leaveBtn = document.getElementById("leaveBtn");
const copyRoomIdBtn = document.getElementById("copyRoomId");
const copyTooltip = document.getElementById("copyTooltip");

let myVideoStream;
const myVideo = document.createElement("video");
myVideo.muted = true;

// Track mute state
let isAudioMuted = false;
let isVideoOff = false;

// STUN/TURN servers configuration
const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    // You would add your TURN server here
    {
      urls: "turn:35.183.200.31:3478",
      credential: "password",
      username: "username",
    },
  ],
};

// Initialize Peer connection
const myPeer = new Peer(undefined, {
  config: iceServers,
});

const peers = {};

// Get user media
navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream, "You");

    // Answer calls from other users
    myPeer.on("call", (call) => {
      call.answer(stream);

      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream, call.peer.substring(0, 5));
      });

      call.on("close", () => {
        removeVideoStream(video);
      });

      peers[call.peer] = call;
    });

    // When a new user connects
    socket.on("user-connected", (userId) => {
      console.log("User connected: " + userId);
      connectToNewUser(userId, stream);
    });
  })
  .catch((err) => {
    console.error("Failed to get media devices", err);
    alert(
      "Failed to access camera and microphone. Please ensure you have granted permission.",
    );
  });

// When a user disconnects
socket.on("user-disconnected", (userId) => {
  console.log("User disconnected: " + userId);
  if (peers[userId]) {
    peers[userId].close();
    delete peers[userId];
  }
});

// When we join a room
myPeer.on("open", (id) => {
  console.log("My peer ID is: " + id);
  socket.emit("join-room", ROOM_ID, id);
});

// Connect to a new user
function connectToNewUser(userId, stream) {
  console.log("Connecting to user: " + userId);
  const call = myPeer.call(userId, stream);
  const video = document.createElement("video");

  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream, userId.substring(0, 5));
  });

  call.on("close", () => {
    removeVideoStream(video);
  });

  peers[userId] = call;
}

// Add a video stream to the grid
function addVideoStream(video, stream, username) {
  // Create container for video
  const videoContainer = document.createElement("div");
  videoContainer.className = "video-container fade-in";

  // Add loading indicator
  const loading = document.createElement("div");
  loading.className = "loading";
  const spinner = document.createElement("div");
  spinner.className = "spinner";
  loading.appendChild(spinner);
  videoContainer.appendChild(loading);

  // Set up video element
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
    loading.remove(); // Remove loading indicator when video starts playing
  });

  videoContainer.appendChild(video);

  // Add user info label
  const userInfo = document.createElement("div");
  userInfo.className = "user-info";
  userInfo.textContent = username || "User";
  videoContainer.appendChild(userInfo);

  // Add data attribute to identify this video container
  videoContainer.dataset.username = username;

  videoGrid.appendChild(videoContainer);
}

// Remove video stream
function removeVideoStream(video) {
  const container = video.closest(".video-container");
  if (container) {
    container.classList.add("fade-out");
    setTimeout(() => container.remove(), 300);
  }
}

// UI Controls
muteBtn.addEventListener("click", () => {
  if (!myVideoStream) return;

  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    isAudioMuted = true;
    muteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    muteBtn.classList.add("active");

    // Add muted indicator to my video
    const myVideoContainer = document.querySelector(
      `.video-container[data-username="You"]`,
    );
    if (myVideoContainer) {
      const userInfo = myVideoContainer.querySelector(".user-info");
      userInfo.classList.add("muted");
    }
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    isAudioMuted = false;
    muteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    muteBtn.classList.remove("active");

    // Remove muted indicator from my video
    const myVideoContainer = document.querySelector(
      `.video-container[data-username="You"]`,
    );
    if (myVideoContainer) {
      const userInfo = myVideoContainer.querySelector(".user-info");
      userInfo.classList.remove("muted");
    }
  }
});

videoToggleBtn.addEventListener("click", () => {
  if (!myVideoStream) return;

  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    isVideoOff = true;
    videoToggleBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
    videoToggleBtn.classList.add("active");
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    isVideoOff = false;
    videoToggleBtn.innerHTML = '<i class="fas fa-video"></i>';
    videoToggleBtn.classList.remove("active");
  }
});

leaveBtn.addEventListener("click", () => {
  // Confirm before leaving
  if (confirm("Are you sure you want to leave this meeting?")) {
    window.location.href = "/";
  }
});

copyRoomIdBtn.addEventListener("click", () => {
  const roomId = document.getElementById("roomId").textContent;
  navigator.clipboard
    .writeText(roomId)
    .then(() => {
      alert("Room ID copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy room ID: ", err);
    });
});
