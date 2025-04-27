import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SyncActions } from 'src/constants';
import { Room as RoomSchema } from '../schemas/room.schema';
import { ChatMessage, Room } from './sync.interfaces';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SyncActionProcessor {
  constructor(
    @InjectModel(RoomSchema.name) private readonly roomModel: Model<RoomSchema>,
  ) {}

  processAction(
    room: Room,
    action: SyncActions,
    value?: number,
  ): { updated: boolean; error?: string } {
    switch (action) {
      case SyncActions.PLAY:
        room.syncState.isPlaying = true;
        return { updated: true };
      case SyncActions.PAUSE:
        room.syncState.isPlaying = false;
        return { updated: true };
      case SyncActions.SEEK:
        if (typeof value === 'number' && value >= 0) {
          room.syncState.time = value;
          return { updated: true };
        } else {
          return { updated: false, error: 'Invalid seek value' };
        }
      default:
        return { updated: false, error: 'Unhandled action' };
    }
  }

  /**
   * Create and persist a system message for a room
   * @param roomId The ID of the room
   * @param content The message content
   * @returns The created message object
   */
  async addSystemMessage(
    roomId: string,
    content: string,
  ): Promise<ChatMessage> {
    const message: ChatMessage = {
      messageId: uuidv4(),
      userId: 'system',
      username: 'System',
      content: content,
      timestamp: new Date().toISOString(),
      systemMessage: true,
    };

    try {
      // Persist the message to the database
      await this.roomModel.updateOne({ roomId }, { $push: { chat: message } });
    } catch (error) {
      console.error(`Failed to save system message for room ${roomId}:`, error);
      // We still return the message even if DB update fails,
      // so the message can be shown in the UI
    }

    return message;
  }

  /**
   * Retrieves recent chat messages for a room
   * @param roomId The ID of the room
   * @param limit Maximum number of messages to retrieve
   * @returns Array of chat messages
   */
  async getRecentMessages(roomId: string, limit = 50): Promise<ChatMessage[]> {
    try {
      const query = this.roomModel.findOne(
        { roomId },
        { chat: { $slice: -limit } },
      );

      // In production, we'll use exec() but in tests the mock might not have it
      const room =
        typeof query.exec === 'function' ? await query.exec() : await query;

      return room?.chat || [];
    } catch (error) {
      console.error(`Failed to get recent messages for room ${roomId}:`, error);
      return [];
    }
  }
}
