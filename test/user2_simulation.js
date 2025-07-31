/* eslint-disable @typescript-eslint/no-require-imports */
const io = require('socket.io-client');
const fs = require('fs');

// Server URL
const SERVER_URL = 'http://localhost:5060/watch-together';

// User 2 Authentication Token
const USER2_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODUxMzQ2MzgwYzJkMzNkOTYyOWUyOWQiLCJlbWFpbCI6ImFobWVkcWVzdGEyQGV4YW1wbGUuY29tIiwidXNlcm5hbWUiOiJhaG1lZHFlc2h0YTIiLCJjcmVhdGVkQXQiOiIyMDI1LTA2LTE3VDA5OjI0OjUxLjQzNVoiLCJpYXQiOjE3NTA1ODI1NTMsImV4cCI6MTc1MDU4NjE1M30.ki9RaJBY_j9PAb9iEzb416Czq-tAYsX-w_BAoSdK_Eg';

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

  // Send welcome chat message
  setTimeout(() => {
    console.log('User 2 sending welcome chat message...');
    user2.emit('chat:send', {
      roomId: ROOM_ID,
      text: 'Hi everyone! Thanks for the invite!',
    });
  }, 2000);

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

  // Send chat message about video
  setTimeout(() => {
    console.log('User 2 sending video chat message...');
    user2.emit('chat:send', {
      roomId: ROOM_ID,
      text: 'I have a different video to share!',
    });
  }, 4000);

  // Send chat message about playing
  setTimeout(() => {
    console.log('User 2 sending play chat message...');
    user2.emit('chat:send', {
      roomId: ROOM_ID,
      text: "Let's start watching!",
    });
  }, 8000);

  // Send chat message about seeking
  setTimeout(() => {
    console.log('User 2 sending seek chat message...');
    user2.emit('chat:send', {
      roomId: ROOM_ID,
      text: 'Jumping to 10 minutes!',
    });
  }, 10000);

  // Send chat message about pausing
  setTimeout(() => {
    console.log('User 2 sending pause chat message...');
    user2.emit('chat:send', {
      roomId: ROOM_ID,
      text: 'Pausing for a moment...',
    });
  }, 12000);

  // Send final chat message
  setTimeout(() => {
    console.log('User 2 sending final chat message...');
    user2.emit('chat:send', {
      roomId: ROOM_ID,
      text: 'Great session everyone! See you next time!',
    });
  }, 15000);

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

  // Listen for chat messages
  user2.on('chat:receive', (data) => {
    console.log('User 2 received chat message:', data);
  });

  user2.on('chat:ack', (data) => {
    console.log('User 2 chat message acknowledged:', data);
  });

  user2.on('chat:error', (error) => {
    console.error('User 2 chat error:', error);
  });

  user2.on('newMessage', (data) => {
    console.log('User 2 new system message:', data);
  });

  user2.on('chatHistory', (data) => {
    console.log('User 2 chat history:', data);
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
