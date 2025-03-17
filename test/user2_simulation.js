const io = require('socket.io-client');
const fs = require('fs');

// Server URL
const SERVER_URL = 'http://localhost:5050/watch-together';

// User 2 Authentication Token
const USER2_TOKEN = 'token';

// Read roomId from the file
const ROOM_ID = fs.readFileSync('roomId.txt', 'utf8').trim();

// Connect as User 2
const user2 = io(SERVER_URL, {
  extraHeaders: { Authorization: `Bearer ${USER2_TOKEN}` },
});

// Main Logic for User 2
let syncCheckInterval;

user2.on('connect', () => {
  console.log('User 2 connected:', user2.id);

  // Join the room
  console.log('User 2 joining the room:', ROOM_ID);
  user2.emit('joinRoom', { roomId: ROOM_ID });

  // Attempt to update room info (unauthorized)
  console.log('Non-Owner attempting to update room info...');
  user2.emit('updateRoomInfo', {
    roomId: ROOM_ID,
    updates: {
      name: 'Invalid Update',
    },
  });

  // Attempt to play video (unauthorized)
  console.log('Non-Owner attempting to play the video...');
  user2.emit('updateSyncState', {
    roomId: ROOM_ID,
    action: 'play',
  });

  // Periodically check sync state
  syncCheckInterval = setInterval(() => {
    console.log('User 2 sending sync-check...');
    user2.emit('checkSync', { roomId: ROOM_ID });
  }, 5000); // Every 5 seconds

  // Listen for sync state
  user2.on('syncState', (sync) => {
    console.log('User 2 received sync state:', sync);
  });

  // Listen for room updates
  user2.on('roomUpdates', (update) => {
    console.log('Room updated:', update);
  });

  // Handle errors
  user2.on('error', (error) => {
    console.error('User 2 error:', error.message);
  });

  // Simulate leaving the room
  setTimeout(() => {
    console.log('User 2 leaving the room...');
    user2.emit('leaveRoom', { roomId: ROOM_ID });

    // Disconnect User 2
    console.log('User 2 disconnecting...');
    user2.disconnect();
  }, 20000); // Leave after 20 seconds
});

// Disconnect handling
user2.on('disconnect', () => {
  console.log('User 2 disconnected');
  if (syncCheckInterval) {
    clearInterval(syncCheckInterval);
  }
});
