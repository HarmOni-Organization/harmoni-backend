const io = require('socket.io-client');

const socket = io('http://localhost:5060'); // Replace with your server's URL

socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
  socket.emit('ping', { message: 'Hello, server!' }); // Send "ping"
});

socket.on('pong', (data) => {
  console.log('Received "pong" from server:', data);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
