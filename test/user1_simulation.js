/* eslint-disable @typescript-eslint/no-require-imports */
const io = require('socket.io-client');
const fs = require('fs');

// Server URL
const SERVER_URL = 'http://localhost:5060/watch-together';

// User 1 Authentication Token
const USER1_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODNjMWFhZmVhOWQ2MzIwMTY2MzQzY2MiLCJlbWFpbCI6ImFobWVkcWVzdGFAZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFobWVkcWVzaHRhIiwiY3JlYXRlZEF0IjoiMjAyNS0wNi0wMVQwOToxNzozNS4xNDJaIiwiaWF0IjoxNzUwNTgyNTA5LCJleHAiOjE3NTA1ODYxMDl9.vqzUyQIHsqi_PpN_2HHUeks9fE-5iqYecvRbrdSdbu4';

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

  // Chat events
  user1.on('chat:receive', (data) => {
    console.log('User1 received chat message:', data);
  });

  user1.on('chat:ack', (data) => {
    console.log('User1 chat message acknowledged:', data);
  });

  user1.on('chat:error', (error) => {
    console.error('User1 chat error:', error);
  });

  user1.on('newMessage', (data) => {
    console.log('User1 new system message:', data);
  });

  user1.on('chatHistory', (data) => {
    console.log('User1 chat history:', data);
  });
});

// Disconnect handling
user1.on('disconnect', () => {
  console.log('User 1 disconnected');
  if (syncCheckInterval) {
    clearInterval(syncCheckInterval);
  }
});

function sendChatMessage(roomId, text) {
  user1.emit('chat:send', {
    roomId,
    text,
  });
}

// Example usage
function simulateUser1() {
  // Create a room
  user1.emit('createRoom', { name: "User1's Room" });

  // Wait for room creation and then join
  user1.on('roomCreated', (data) => {
    const roomId = data.roomId;

    // Send a chat message
    setTimeout(() => {
      sendChatMessage(roomId, 'Hello everyone! Welcome to my room!');
    }, 1500);

    // Update room info
    setTimeout(() => {
      user1.emit('updateRoomInfo', {
        roomId,
        updates: {
          name: 'Updated Room Name',
          description: 'Updated description',
        },
      });
    }, 2000);

    // Send another chat message
    setTimeout(() => {
      sendChatMessage(roomId, 'I just updated the room name!');
    }, 2500);

    // Update file info
    setTimeout(() => {
      user1.emit('updateFileInfo', {
        roomId,
        fileInfo: {
          fileId: 'file123',
          name: 'example.mp4',
          fullTime: 3600,
          hash: 'abc123',
        },
      });
    }, 4000);

    // Send chat message about the video
    setTimeout(() => {
      sendChatMessage(roomId, 'I added a new video to watch together!');
    }, 4500);

    // Check sync
    setTimeout(() => {
      user1.emit('checkSync', { roomId });
    }, 6000);

    // Update sync state
    setTimeout(() => {
      user1.emit('updateSyncState', {
        roomId,
        action: 'PLAY',
        value: 0,
      });
    }, 8000);

    // Send chat message about playing
    setTimeout(() => {
      sendChatMessage(roomId, 'Starting the video now!');
    }, 8500);

    // Ping
    setTimeout(() => {
      user1.emit('ping');
    }, 10000);

    // Final chat message
    setTimeout(() => {
      sendChatMessage(roomId, 'Thanks for watching with me!');
    }, 11000);

    // Leave room
    setTimeout(() => {
      user1.emit('leaveRoom', roomId);
    }, 12000);
  });
}

simulateUser1();
