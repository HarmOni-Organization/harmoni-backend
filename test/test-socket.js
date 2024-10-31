const io = require('socket.io-client');

// Connect to the WebSocket server
const socket = io('http://localhost:5050');

// Room and user details
const roomId = 'room123';
const username = 'Alice';

// Emit the 'joinRoom' event
console.log(`Joining room: ${roomId} as ${username}`);
socket.emit('joinRoom', { roomId, username });

// Listen for chat messages (e.g., user joined or left messages)
socket.on('chatMessage', (data) => {
  console.log(data.message);  // Display any chat messages sent from the server
});

// Listen for sync events to synchronize video playback
socket.on('syncTime', (data) => {
  console.log(`Syncing video: time=${data.time}, isPlaying=${data.isPlaying}`);
});

// Listen for typing status updates
socket.on('typingStatusUpdate', (data) => {
  console.log(`User ${data.userId} is ${data.isTyping ? 'typing...' : 'not typing'}`);
});

// Listen for playback updates (play, pause, seek) as separate events
socket.on('playbackUpdate', (data) => {
  console.log(`Playback update received: eventType=${data.eventType}, time=${data.time}, isPlaying=${data.isPlaying}`);
});

// Test Typing Event: Simulate the typing status
function testTyping(isTyping) {
  console.log(`Sending typing status: ${isTyping}`);
  socket.emit('userTyping', { roomId, userId: socket.id, isTyping });
}

// Test Playback Event: Send specific playback events with separate calls
function testPlayback(eventType, time = 0) {
  console.log(`Sending playback event: ${eventType}, time=${time}`);
  socket.emit('playbackEvent', { roomId, eventType, time });
}

// Test Sync Check: Simulate a periodic sync check with the server
function testSyncCheck() {
  console.log('Sending sync check to the server');
  socket.emit('syncCheck', { roomId });
}

// Test Sequence: Perform all events with a delay between them
setTimeout(() => testPlayback('play'), 2000);           // Play after joining
setTimeout(() => testPlayback('pause'), 4000);          // Pause after 4 seconds
setTimeout(() => testPlayback('seek', 120), 6000);      // Seek to 120 seconds after 6 seconds
setTimeout(() => testTyping(true), 8000);               // Start typing after 8 seconds
setTimeout(() => testTyping(false), 10000);             // Stop typing after 10 seconds

// Periodic sync check every 5 seconds
setInterval(testSyncCheck, 5000);
