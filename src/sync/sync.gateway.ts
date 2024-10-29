import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { generateRoomId, checkFileConsistency, getRoomState, updateUserTypingStatus } from './syncUtils'; // Importing the utils
import { UserInfo, RoomState, FileInfo } from './types'; // Assuming types are defined in a shared file

const roomStates: Record<string, RoomState> = {}; // Store room states
const roomUsers: Record<string, UserInfo[]> = {}; // Store room members

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SyncGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Handle new connections
  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  // Handle disconnections
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    for (const roomId in roomUsers) {
      const userIndex = roomUsers[roomId]?.findIndex(user => user.userId === client.id);
      if (userIndex !== -1) {
        const username = roomUsers[roomId][userIndex].username;
        roomUsers[roomId].splice(userIndex, 1);
        this.server.to(roomId).emit('chatMessage', { message: `User ${username} has left the room` });
        this.broadcastFullRoomState(roomId);
        if (roomUsers[roomId].length === 0) {
          delete roomUsers[roomId];
          delete roomStates[roomId];
        }
      }
    }
  }

  // Generate roomId if not provided, handle optional room password
  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, payload: { roomId?: string; username: string; roomPassword?: string }): void {
    let roomId = payload.roomId;
    if (!roomId) {
      roomId = generateRoomId(); // Use the util function to generate a new roomId
      client.emit('roomIdGenerated', roomId); // Send generated roomId to user
    }

    client.join(roomId);

    if (!roomUsers[roomId]) {
      roomUsers[roomId] = [];
      roomStates[roomId] = {
        roomInfo: {
          roomName: `Room ${roomId}`,
          ownerId: client.id,
          isArchived: false,
          createdAt: new Date().toISOString(),
        },
        syncInfo: {
          time: 0,
          isPlaying: false,
          syncErrorMargin: 0.5, // Default sync error margin
        },
      };
      if (payload.roomPassword) {
        roomStates[roomId].roomInfo.passwordProtected = true;
        roomStates[roomId].roomInfo.roomPassword = payload.roomPassword;
      }
    }

    roomUsers[roomId].push({
      userId: client.id,
      username: payload.username,
      isHost: roomUsers[roomId].length === 0, // First user is the host
      isTyping: false, // New typing status property
      fileInfo: {
        fileHash: '',
        fileSize: 0,
        videoId: '',
        title: '',
        duration: 0,
      },
    });

    this.server.to(roomId).emit('chatMessage', { message: `User ${payload.username} has joined the room` });
    this.broadcastFullRoomState(roomId);
  }

  // Update syncInfo (frequent updates)
  @SubscribeMessage('syncUpdate')
  handleSyncUpdate(client: Socket, payload: { roomId: string; time: number; isPlaying: boolean }): void {
    const roomState = roomStates[payload.roomId];
    if (roomState) {
      roomState.syncInfo.time = payload.time;
      roomState.syncInfo.isPlaying = payload.isPlaying;
      this.server.to(payload.roomId).emit('syncTime', { time: roomState.syncInfo.time, isPlaying: roomState.syncInfo.isPlaying });
    }
  }

  // Typing event listener
  @SubscribeMessage('userTyping')
  handleUserTyping(client: Socket, payload: { roomId: string; userId: string; isTyping: boolean }): void {
    const { roomId, userId, isTyping } = payload;
    const room = roomUsers[roomId];
    if (!room) return; // Room doesn't exist

    // Find user in the room
    const user = room.find(u => u.userId === userId);
    if (user) {
      // Update typing status
      updateUserTypingStatus(user, isTyping);

      // Broadcast to other room members
      this.broadcastTypingStatus(roomId, user);
    }
  }

  // Broadcast typing status to room members
  broadcastTypingStatus(roomId: string, user: UserInfo) {
    const typingUpdate = {
      event: 'typingStatusUpdate',
      userId: user.userId,
      isTyping: user.isTyping,
    };

    // Emit to all clients in the room except the user themselves
    this.server.to(roomId).emit('typingStatusUpdate', typingUpdate);
    console.log(`Broadcasting typing status in room ${roomId}:`, typingUpdate);
  }

  // Handle video file updates
  @SubscribeMessage('updateFileInfo')
  handleUpdateFileInfo(client: Socket, payload: { roomId: string; fileInfo: FileInfo }): void {
    const roomId = payload.roomId;
    const userIndex = roomUsers[roomId]?.findIndex(user => user.userId === client.id);
    if (userIndex !== -1) {
      roomUsers[roomId][userIndex].fileInfo = payload.fileInfo;
      const allFilesConsistent = checkFileConsistency(roomUsers[roomId]);
      if (!allFilesConsistent) {
        this.server.to(roomId).emit('chatMessage', { message: 'Warning: Some users are using different video files.' });
      }
      this.broadcastFullRoomState(roomId);
    }
  }

  // Broadcast full room state
  broadcastFullRoomState(roomId: string): void {
    const roomState = getRoomState(roomStates, roomUsers, roomId); // Use the util function
    if (roomState) {
      this.server.to(roomId).emit('fullRoomState', roomState);
    }
  }

  // Handle requests to get the list of users in a room (on-demand)
  @SubscribeMessage('getRoomUsers')
  handleGetRoomUsers(client: Socket, roomId: string): void {
    const users = roomUsers[roomId] || [];
    client.emit('roomUsers', users);
  }
}
