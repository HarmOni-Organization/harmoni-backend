const io = require('socket.io-client');
const fs = require('fs');

// Server URL
const SERVER_URL = 'http://localhost:5050/watch-together';

// User 1 Authentication Token
const USER1_TOKEN = 'token';

// Connect as User 1
const user1 = io(SERVER_URL, {
  extraHeaders: { Authorization: `Bearer ${USER1_TOKEN}` },
});

// Main Logic for User 1
let syncCheckInterval;

user1.on('connect', () => {
  console.log('User 1 connected:', user1.id);

  // Create a room
  console.log('User 1 creating a room...');
  user1.emit('createRoom', { name: "User1's Room" });

  // Listen for room creation
  user1.on('roomCreated', (data) => {
    const roomId = data.roomId;
    console.log('Room created by User 1:', roomId);

    // Save roomId to a file to share with User 2
    fs.writeFileSync('roomId.txt', roomId, 'utf8');
    console.log('Room ID saved to roomId.txt');

    // Update Room Info
    console.log('Updating room info...');
    user1.emit('updateRoomInfo', {
      roomId,
      updates: {
        name: 'Updated Room Name',
        description: 'This is the updated description.',
        isPrivate: true,
      },
    });

    // Update File Info
    setTimeout(() => {
      console.log('Updating file info...');
      user1.emit('updateFileInfo', {
        roomId,
        fileInfo: {
          fileId: 'file123',
          name: 'Updated File Name',
          fullTime: 3600,
          hash: 'abc123hash',
        },
      });
    }, 3000); // Delay for 3 seconds

    // Simulate playing the video
    setTimeout(() => {
      console.log('User 1 playing the video...');
      user1.emit('updateSyncState', {
        roomId,
        action: 'play',
      });
    }, 5000); // Delay for 5 seconds

    // Simulate pausing the video
    setTimeout(() => {
      console.log('User 1 pausing the video...');
      user1.emit('updateSyncState', {
        roomId,
        action: 'pause',
      });
    }, 8000); // Delay for 8 seconds

    // Simulate playing the video
    setTimeout(() => {
      console.log('User 1 playing the video...');
      user1.emit('updateSyncState', {
        roomId,
        action: 'play',
      });
    }, 10000); // Delay for 10 seconds

    // Seek to a specific time
    setTimeout(() => {
      console.log('User 1 seeking to 120 seconds...');
      user1.emit('updateSyncState', {
        roomId,
        action: 'seek',
        value: 120,
      });
    }, 10000); // Delay for 10 seconds

    // Periodically check sync state
    syncCheckInterval = setInterval(() => {
      console.log('User 1 sending sync-check...');
      user1.emit('checkSync', { roomId });
    }, 5000); // Every 5 seconds
  });

  // Listen for room updates
  user1.on('roomUpdates', (update) => {
    console.log('Room updated:', update);
  });

  // Listen for sync state
  user1.on('syncState', (sync) => {
    console.log('User 1 received sync state:', sync);
  });

  // Handle success responses
  user1.on('success', (data) => {
    console.log('Success:', data.message);
  });

  // Handle errors
  user1.on('error', (error) => {
    console.error('Error:', error.message);
  });
});

// Disconnect handling
user1.on('disconnect', () => {
  console.log('User 1 disconnected');
  if (syncCheckInterval) {
    clearInterval(syncCheckInterval);
  }
});
