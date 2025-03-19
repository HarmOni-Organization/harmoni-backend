import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room as RoomSchema } from '../schemas/room.schema';
import { Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { AuthGuard, ValidateRoomAccessGuard } from 'src/guards';
import { FileInfo, Room, RoomInfo, SyncState } from './sync.interfaces';
import { generateRoomId } from './sync.utils';
import { RoomStatus, RoomType, MemberRole, SyncActions } from 'src/constants';
import { SyncActionProcessor } from './sync.service';

@WebSocketGateway({
  namespace: '/watch-together',
  cors: true,
})
export class SyncGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  // private rooms: Record<string, Room> = {};

  constructor(
    private readonly authMiddleware: AuthMiddleware,
    private readonly syncActionProcessor: SyncActionProcessor,
    @Inject('ROOMS') private readonly rooms: Record<string, Room>,
    @InjectModel(RoomSchema.name) private readonly roomModel: Model<RoomSchema>,
  ) {}

  onModuleInit() {
    this.server.use((socket, next) =>
      this.authMiddleware.forSocket(socket, next),
    );
  }
  handleConnection(client: Socket) {
    const { user } = client.data;

    console.log(`Client Connected: ${client.id}, UserId: ${user.userId}`);
    client.emit('connectionAcknowledged', {
      message: 'Connected successfully',
      clientId: client.id,
      userId: user.userId,
    });
  }

  handleDisconnect(client: Socket) {
    const { userId } = client.data.user;

    // TODO: remove before deployment
    // this should never work
    if (!userId) {
      console.warn(`Client disconnected without valid userId: ${client.id}`);
      return;
    }

    console.log(`Client disconnected: ${client.id}, UserId: ${userId}`);

    Object.keys(this.rooms).forEach((roomId) => {
      const room = this.rooms[roomId];
      if (room.members.some((member) => member.userId === userId)) {
        this.removeClientFromRoom(client, roomId, 'userDisconnected');
      }
    });
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('createRoom')
  async handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      name?: string;
      description?: string;
      isPrivate?: boolean;
    },
  ) {
    const { name, description, isPrivate = false } = data;
    const user = client.data.user;

    // Generate a unique roomId
    let roomId: string;
    do {
      roomId = generateRoomId();
    } while (await this.roomModel.findOne({ roomId }).exec());

    const newRoom: Room = {
      roomId,
      roomInfo: {
        name: name || `${user.username}'s Room`,
        description: description || '',
        ownerId: user.userId,
        isPrivate,
        status: RoomStatus.ACTIVE,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        roomType: RoomType.WATCH_TOGETHER,
      },
      syncState: {
        time: 0,
        isPlaying: false,
        lastUpdated: Date.now(),
        syncErrorMargin: 500,
      },
      members: [],
      files: [],
      chat: [],
    };

    try {
      // Save the room in the database
      await this.roomModel.create(newRoom);

      // Activate the room in memory
      this.rooms[roomId] = newRoom;

      // Add the owner to the room
      this.addUserToRoom(roomId, user, client.id);

      // Join the Socket.IO room
      client.join(roomId);

      // Emit the created roomId to the client
      client.emit('roomState', newRoom);

      // Emit the room update
      this.emitRoomUpdate(roomId, newRoom, {
        action: 'createRoom',
        userId: user.userId,
      });

      console.log(
        `Room created and owner joined: ${roomId} by user ${user.username}`,
      );
    } catch (error) {
      console.error('Error creating room:', error);
      client.emit('error', { message: 'Error creating room' });
    }
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    const { roomId } = data;
    const user = client.data.user;

    // Check if the room exists in memory
    let room = this.rooms[roomId];

    if (!room) {
      // Fetch only the roomInfo from the database
      const dbRoom = await this.roomModel
        .findOne({ roomId }, { roomInfo: 1 }) // Fetch only roomInfo
        .exec();

      if (!dbRoom) {
        client.emit('error', { message: 'Room does not exist' });
        return;
      }

      if (dbRoom.roomInfo.status === RoomStatus.ARCHIVED) {
        client.emit('error', {
          message: 'Room is archived and cannot be joined',
        });
        return;
      }

      // Activate the room in memory
      this.rooms[roomId] = {
        roomId,
        roomInfo: {
          name: dbRoom.roomInfo.name,
          description: dbRoom.roomInfo.description,
          ownerId: dbRoom.roomInfo.ownerId,
          isPrivate: dbRoom.roomInfo.isPrivate,
          status: RoomStatus.ACTIVE,
          createdAt: dbRoom.roomInfo.createdAt,
          lastActivity: Date.now(),
          roomType: dbRoom.roomInfo.roomType,
        },
        syncState: {
          time: 0,
          isPlaying: false,
          lastUpdated: Date.now(),
          syncErrorMargin: 500,
        },
        members: [],
        files: [],
        chat: [],
      };
      room = this.rooms[roomId];
    }

    // Add the user to the room
    this.addUserToRoom(roomId, user, client.id);

    // Join the Socket.IO room
    client.join(roomId);

    // Notify others about the new member
    client.to(roomId).emit('userJoined', {
      userId: user.userId,
      username: user.username,
    });

    // Emit the full room object to the joining user
    client.emit('roomState', room);

    // Emit room update
    this.emitRoomUpdate(
      roomId,
      { members: room.members, files: room.files },
      { action: 'joinRoom', userId: user.userId },
    );

    console.log(`User ${user.username} joined room: ${roomId}`);
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const { roomId } = data;

    if (this.rooms[roomId]) {
      this.removeClientFromRoom(client, roomId, 'userLeft');
      console.log(`User ${client.data.user.username} left room: ${roomId}`);
    }
  }

  @SubscribeMessage('updateRoomInfo')
  @UseGuards(ValidateRoomAccessGuard, AuthGuard)
  async handleUpdateRoomInfo(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      updates: Partial<
        Pick<RoomInfo, 'name' | 'description' | 'isPrivate' | 'status'>
      >;
    },
  ): Promise<void> {
    const { roomId, updates } = data;
    const user = client.data.user;

    // Validate that the room exists in memory
    const room = this.rooms[roomId];

    if (!room) {
      client.emit('error', { message: 'Room does not exist' });
      return;
    }

    // Validate that the user is the owner
    if (room.roomInfo.ownerId !== user.userId) {
      client.emit('error', { message: 'Only the owner can update room info' });
      return;
    }

    // Validate updates
    const allowedFields = ['name', 'description', 'isPrivate', 'status'];
    for (const key of Object.keys(updates)) {
      if (!allowedFields.includes(key)) {
        client.emit('error', {
          message: `Field "${key}" is not allowed to be updated`,
        });
        return;
      }
    }

    // Handle `inactive` or `archived` status
    if ([RoomStatus.INACTIVE, RoomStatus.ARCHIVED].includes(updates.status)) {
      console.log(
        `Room ${roomId} is being set to ${updates.status} by user ${user.userId}`,
      );

      // Notify all members
      this.server.to(roomId).emit('roomClosed', {
        message: `The room has been ${updates.status === RoomStatus.INACTIVE ? 'closed' : 'archived'} by the owner`,
      });

      // Disconnect all clients in the room
      this.server.socketsLeave(roomId);

      // Update the database
      try {
        await this.roomModel.updateOne(
          { roomId },
          { $set: { 'roomInfo.status': updates.status } },
        );
        console.log(`Room ${roomId} marked as ${updates.status} in database`);
      } catch (error) {
        console.error(
          `Failed to update room status to ${updates.status} for room ${roomId}:`,
          error,
        );
        client.emit('error', {
          message: `Failed to update room status in database`,
        });
        return;
      }

      // Remove the room from memory
      delete this.rooms[roomId];
      console.log(`Room ${roomId} has been removed from memory`);

      return; // Exit as the room no longer exists
    }

    // Apply updates to in-memory roomInfo
    Object.assign(room.roomInfo, updates);

    // Update the database for other fields
    try {
      const dbUpdates = Object.entries(updates).reduce(
        (acc, [key, value]) => {
          acc[`roomInfo.${key}`] = value;
          return acc;
        },
        {} as Record<string, any>,
      );

      await this.roomModel.updateOne({ roomId }, { $set: dbUpdates });
      console.log(`Room info updated in database for room ${roomId}:`, updates);
    } catch (error) {
      console.error(
        `Failed to update room info in database for room ${roomId}:`,
        error,
      );
      client.emit('error', {
        message: 'Failed to update room info in database',
      });
      return;
    }

    // Emit the room update event for non-status changes
    this.emitRoomUpdate(
      roomId,
      { roomInfo: room.roomInfo },
      { action: 'updateRoomInfo', userId: user.userId },
    );

    console.log(
      `Room info updated successfully for room ${roomId} by user ${user.userId}`,
    );
  }

  @SubscribeMessage('updateFileInfo')
  @UseGuards(ValidateRoomAccessGuard, AuthGuard)
  async handleUpdateFileInfo(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; fileInfo: FileInfo },
  ): Promise<void> {
    const { roomId, fileInfo } = data;
    const userId = client.data?.user?.userId;

    if (!roomId || !fileInfo) {
      client.emit('error', { message: 'Invalid data provided' });
      return;
    }

    // Validate room and user
    const room = this.rooms[roomId];
    if (!room) {
      client.emit('error', { message: 'Room does not exist' });
      return;
    }

    const isMember = room.members.some((member) => member.userId === userId);
    if (!isMember) {
      client.emit('error', { message: 'You are not a member of this room' });
      return;
    }

    // Update file info
    try {
      await this.addFileToRoom(client, roomId, fileInfo);
      client.emit('success', { message: 'File info updated successfully' });
      // // Emit the sync state to the client
      // client.emit('syncState', {
      //   time: room.syncState.time,
      //   isPlaying: room.syncState.isPlaying,
      // });
      // this.emitRoomUpdate(
      //   roomId,
      //   { syncState: room.syncState },
      //   { action: SyncActions.PAUSE, userId: null },
      // );
    } catch (error) {
      client.emit('error', { message: 'Failed to update file info' });
      console.error(
        `Failed to update file info for user ${userId} in room ${roomId}:`,
        error,
      );
    }
  }

  @SubscribeMessage('checkSync')
  @UseGuards(ValidateRoomAccessGuard, AuthGuard)
  async handleCheckSync(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    const { roomId } = data;
    const userId = client.data?.user?.userId;

    // Validate room and user
    const room = this.rooms[roomId];
    if (!room) {
      client.emit('error', { message: 'Room does not exist' });
      return;
    }

    const isMember = room.members.some((member) => member.userId === userId);
    if (!isMember) {
      client.emit('error', { message: 'You are not a member of this room' });
      return;
    }

    // Emit the sync state to the client
    client.emit('syncState', {
      time: room.syncState.time,
      isPlaying: room.syncState.isPlaying,
    });

    console.log(
      `User ${userId} checked sync for room ${roomId}:`,
      room.syncState,
    );
  }

  @SubscribeMessage('updateSyncState')
  @UseGuards(ValidateRoomAccessGuard, AuthGuard)
  async handleUpdateSyncState(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomId: string; action: SyncActions; value?: number },
  ): Promise<void> {
    const { roomId, action, value } = data;
    const userId = client.data?.user?.userId;

    // Validate room and user
    const room = this.rooms[roomId];
    if (!room) {
      client.emit('error', { message: 'Room does not exist' });
      return;
    }

    const isMember = room.members.some((member) => member.userId === userId);
    if (!isMember) {
      client.emit('error', { message: 'You are not a member of this room' });
      return;
    }

    // Process the action
    const result = this.syncActionProcessor.processAction(room, action, value);
    if (!result.updated) {
      client.emit('error', { message: result.error });
      return;
    }

    // // Update the database
    // await this.roomModel.updateOne(
    //   { roomId },
    //   { $set: { syncState: room.syncState } },
    // );

    // Trigger playback simulation if necessary
    if (action === SyncActions.PLAY || action === SyncActions.PAUSE) {
      this.simulatePlayback(roomId);
    }

    // Emit sync state update to all clients
    this.emitRoomUpdate(
      roomId,
      { syncState: room.syncState },
      { action, userId },
    );

    console.log(`Sync state updated for room ${roomId}:`, room.syncState);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    console.log(`Ping received from client: ${client.id}`);
    client.emit('pong', { message: 'pong' });
  }

  private async removeClientFromRoom(
    client: Socket,
    roomId: string,
    action: string,
  ): Promise<void> {
    const room = this.rooms[roomId];
    if (!room) {
      console.warn(`Room ${roomId} does not exist`);
      return;
    }

    const { userId, username } = client.data.user;

    // Find the member in the room
    const memberIndex = room.members.findIndex(
      (member) => member.userId === userId,
    );

    if (memberIndex !== -1) {
      // Remove the user from the in-memory room
      room.members.splice(memberIndex, 1);

      // Update the member's active status in the database
      try {
        await this.roomModel.updateOne(
          { roomId, 'members.userId': userId },
          { $set: { 'members.$.active': false } },
        );
        console.log(
          `User ${username} (${userId}) marked inactive in room ${roomId}`,
        );
      } catch (error) {
        console.error(
          `Failed to update member active status for user ${userId} in room ${roomId}:`,
          error,
        );
      }

      // Remove the user's file from the in-memory room
      room.files = room.files.filter((file) => file.userId !== userId);
      console.log(`User ${username}'s files removed from room ${roomId}`);

      // Remove the user from the Socket.IO room
      client.leave(roomId);
      console.log(
        `User ${username} (${userId}) removed from Socket.IO room ${roomId}`,
      );

      // Notify other members
      client.to(roomId).emit('userLeft', {
        userId,
        username,
      });

      console.log(`User ${username} (${userId}) removed from room ${roomId}`);
    } else {
      console.warn(`User ${userId} not found in room ${roomId}`);
    }

    // Emit the room update with metadata
    this.emitRoomUpdate(
      roomId,
      { members: room.members, files: room.files },
      { action, userId },
    );

    console.log(
      `User ${userId} removed from room ${roomId} with action "${action}"`,
    );

    // Check if all members are inactive
    if (room.members.every((member) => !member.active)) {
      // Update the room status to inactive in the database
      try {
        await this.roomModel.updateOne(
          { roomId },
          { $set: { 'roomInfo.status': RoomStatus.INACTIVE } },
        );
        console.log(`Room ${roomId} marked as inactive in database`);
      } catch (error) {
        console.error(
          `Failed to mark room ${roomId} as inactive in database:`,
          error,
        );
      }

      // Delete the room from memory
      delete this.rooms[roomId];
      console.log(`Room ${roomId} deleted from memory`);
    }
  }

  // Add a file to a room
  async addFileToRoom(
    client: Socket,
    roomId: string,
    fileInfo: FileInfo,
  ): Promise<void> {
    const room = this.rooms[roomId];
    if (!room) {
      console.warn(`Room ${roomId} not found`);
      return;
    }

    const { userId } = client.data.user;
    if (!userId) {
      console.warn(
        `Client ${client.id} attempted to update file without a valid userId`,
      );
      return;
    }

    // Ensure the user is a member of the room
    const userExists = room.members.some((member) => member.userId === userId);
    if (!userExists) {
      console.warn(`User ${userId} is not a member of room ${roomId}`);
      return;
    }

    // Update or add the user's file
    const fileIndex = room.files.findIndex((file) => file.userId === userId);
    if (fileIndex !== -1) {
      room.files[fileIndex] = { ...fileInfo, userId };
    } else {
      room.files.push({ ...fileInfo, userId });
    }

    // Persist the update to the database
    try {
      await this.roomModel.updateOne(
        { roomId, 'files.userId': userId },
        { $set: { 'files.$': { ...fileInfo, userId } } }, // Update file
        { upsert: true }, // Add file if it doesn’t exist
      );
      console.log(
        `File info updated in database for user ${userId} in room ${roomId}`,
      );
    } catch (error) {
      console.error(
        `Failed to update file info for user ${userId} in room ${roomId}:`,
        error,
      );
      return;
    }

    // Emit the room update with metadata
    this.emitRoomUpdate(
      roomId,
      { files: room.files },
      { action: 'fileUpdated', userId },
    );

    console.log(`File updated by user ${userId} in room ${roomId}:`, fileInfo);
  }

  private emitRoomUpdate(
    roomId: string,
    updatedFields: Partial<Room>,
    metadata: { action: string; userId: string },
  ) {
    const room = this.rooms[roomId];
    if (!room) {
      console.warn(`Room ${roomId} does not exist for update`);
      return;
    }

    const payload = {
      roomId, // Always include roomId
      metadata, // Action metadata
      roomUpdates: updatedFields, // Updated room fields
    };

    // Emit the update to all connected clients in the room
    this.server.to(roomId).emit('roomUpdates', payload);
    console.log(
      `Room ${roomId} updated with action "${metadata.action}" by user "${metadata.userId}"`,
      updatedFields,
    );
  }

  updateSyncState(client: Socket, roomId: string, newSyncState: SyncState) {
    const room = this.rooms[roomId];
    if (!room) {
      console.warn(`Room ${roomId} not found for sync update`);
      return;
    }

    const userId = client.data?.user?.userId;
    if (!userId) {
      console.warn(
        `Client ${client.id} attempted to update sync state without a valid userId`,
      );
      return;
    }

    room.syncState = { ...room.syncState, ...newSyncState };

    // Emit the sync state update with metadata
    this.emitRoomUpdate(
      roomId,
      { syncState: room.syncState },
      { action: 'syncStateUpdated', userId },
    );

    console.log(
      `Sync state updated in room ${roomId} by user ${userId}:`,
      newSyncState,
    );
  }

  private async addUserToRoom(
    roomId: string,
    user: any,
    clientId: string,
  ): Promise<void> {
    const room = this.rooms[roomId];
    if (!room) {
      console.warn(`Room ${roomId} does not exist`);
      return;
    }

    // Check if the user is already in the room
    if (room.members.some((member) => member.userId === user.userId)) {
      console.warn(`User ${user.userId} is already in room ${roomId}`);
      return;
    }

    // Add user to the in-memory members array
    const newMember = {
      userId: user.userId,
      username: user.username,
      clientId,
      active: true,
      role:
        room.roomInfo.ownerId === user.userId
          ? MemberRole.OWNER
          : MemberRole.MEMBER,
      typing: false,
      lastActivity: Date.now(),
    };
    room.members.push(newMember);

    // Add an empty file for the user in the in-memory files array
    const newFile = {
      fileId: '',
      userId: user.userId,
      name: '',
      fullTime: 0,
      hash: '',
    };
    room.files.push(newFile);

    // Update the database
    try {
      await this.roomModel.updateOne(
        { roomId },
        {
          $push: {
            members: newMember,
            files: newFile,
          },
        },
      );
      console.log(`User ${user.username} added to room ${roomId} in database`);
    } catch (error) {
      console.error(`Failed to update room ${roomId} in database:`, error);
      // Remove from in-memory structure if database update fails
      room.members = room.members.filter(
        (member) => member.userId !== user.userId,
      );
      room.files = room.files.filter((file) => file.userId !== user.userId);
    }

    console.log(`User ${user.username} added to room ${roomId}`);
  }

  private playbackIntervals: Record<string, NodeJS.Timeout> = {};

  simulatePlayback(roomId: string): void {
    const room = this.rooms[roomId];
    if (!room) {
      console.warn(`Room ${roomId} does not exist`);
      return;
    }

    // Clear existing interval to avoid multiple timers
    if (this.playbackIntervals[roomId]) {
      clearInterval(this.playbackIntervals[roomId]);
    }

    // Start updating time if playing
    if (room.syncState.isPlaying) {
      this.playbackIntervals[roomId] = setInterval(() => {
        room.syncState.time += 1; // Increment by 1 second
        room.syncState.lastUpdated = Date.now(); // Track last server update

        // // Emit sync state update to all clients
        // this.emitRoomUpdate(
        //   roomId,
        //   { syncState: room.syncState },
        //   { action: 'playbackTick', userId: 'server' },
        // );
      }, 1000); // Update every second
    } else {
      // Clear interval if paused
      if (this.playbackIntervals[roomId]) {
        clearInterval(this.playbackIntervals[roomId]);
        delete this.playbackIntervals[roomId];
      }
    }
  }
}
