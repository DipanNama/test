// Global variables
let peer, conn, call;
let myId;
let chatHistory = [];

// Theme management
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeToggleText(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeToggleText(newTheme);
}

function updateThemeToggleText(theme) {
  const toggleButton = document.getElementById('theme-toggle');
  if (toggleButton) {
    toggleButton.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  }
}

// Generate a simple 6-digit ID
function generatePeerId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Save chat to localStorage
function saveHistory() {
  localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
}

// Load chat from localStorage
function loadHistory() {
  let stored = JSON.parse(localStorage.getItem("chatHistory")) || [];
  if (stored.length > 0) {
    const divider = document.createElement("div");
    divider.className = "divider";
    divider.textContent = "Previous Messages";
    document.getElementById("messages").appendChild(divider);
  }
  stored.forEach(m => displayMessage(m.text, m.type, m.time, false));
  chatHistory = stored;
}

// Initialize Peer
function initializePeer() {
  myId = generatePeerId();
  peer = new Peer(myId, {
    config: {
      'iceServers': [{ urls: "stun:stun.l.google.com:19302" }]
    }
  });

  peer.on("open", id => {
    document.getElementById("my-peer-id").innerHTML = `
      <span>Your Code: <strong>${id}</strong></span>
      <div class="status-indicator status-online"></div>
    `;
    loadHistory();
  });

  peer.on("connection", connection => {
    conn = connection;
    setupConnection();
  });

  peer.on("call", incomingCall => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        document.getElementById("my-video").srcObject = stream;
        incomingCall.answer(stream);
        incomingCall.on("stream", remoteStream => {
          document.getElementById("peer-video").srcObject = remoteStream;
        });
      })
      .catch(error => {
        console.error("Error accessing media devices:", error);
      });
  });
}

function setupConnection() {
  conn.on("open", () => {
    console.log("Connected to peer!");
  });
  
  conn.on("data", data => {
    displayMessage(data.text, "received", data.time);
    chatHistory.push({ text: data.text, type: "received", time: data.time });
    saveHistory();
  });
}

function connectToPeer() {
  const peerId = document.getElementById("peer-id-input").value.trim();
  if (!peerId) return;
  
  conn = peer.connect(peerId);
  setupConnection();

  // Video call
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      document.getElementById("my-video").srcObject = stream;
      call = peer.call(peerId, stream);
      call.on("stream", remoteStream => {
        document.getElementById("peer-video").srcObject = remoteStream;
      });
    })
    .catch(error => {
      console.error("Error accessing media devices:", error);
    });
}

function sendMessage() {
  const input = document.getElementById("message-input");
  const text = input.value.trim();
  if (!text || !conn) return;

  const message = { text, type: "sent", time: new Date().toLocaleTimeString() };
  conn.send(message);
  displayMessage(message.text, message.type, message.time);
  chatHistory.push(message);
  saveHistory();
  input.value = "";
}

function displayMessage(text, type, time, addToHistory = true) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "message " + type;
  
  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "message-bubble";
  bubbleDiv.textContent = text;
  
  const timeDiv = document.createElement("div");
  timeDiv.className = "message-time";
  timeDiv.textContent = time;
  
  messageDiv.appendChild(bubbleDiv);
  messageDiv.appendChild(timeDiv);
  
  document.getElementById("messages").appendChild(messageDiv);
  document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
  
  if (addToHistory) {
    chatHistory.push({ text, type, time });
    saveHistory();
  }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize theme
  initializeTheme();
  
  // Add Enter key support for message input
  const messageInput = document.getElementById("message-input");
  if (messageInput) {
    messageInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }
  
  // Initialize peer connection
  initializePeer();
});