import { Test, TestingModule } from '@nestjs/testing';
import { SyncActionProcessor } from './sync.service';
import { SyncActions, RoomStatus, RoomType } from '../constants';
import { Room } from './sync.interfaces';
import { getModelToken } from '@nestjs/mongoose';
import { Room as RoomSchema } from '../schemas/room.schema';
import { v4 as uuidv4 } from 'uuid';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-value'),
}));

describe('SyncActionProcessor', () => {
  let service: SyncActionProcessor;
  let mockRoomModel: any;

  beforeEach(async () => {
    // Create mock for roomModel
    mockRoomModel = {
      updateOne: jest.fn().mockResolvedValue({ nModified: 1 }),
      findOne: jest.fn().mockResolvedValue({
        chat: [
          { messageId: 'existing-message-id', content: 'Existing message' },
        ],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncActionProcessor,
        {
          provide: getModelToken(RoomSchema.name),
          useValue: mockRoomModel,
        },
      ],
    }).compile();

    service = module.get<SyncActionProcessor>(SyncActionProcessor);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Create a mock Room that satisfies the interface for testing
  const createMockRoom = (isPlaying = false, time = 0): Room => ({
    roomId: 'test-room-id',
    roomInfo: {
      ownerId: 'test-owner-id',
      isPrivate: false,
      status: RoomStatus.ACTIVE,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      roomType: RoomType.WATCH_TOGETHER,
    },
    syncState: {
      isPlaying,
      time,
      lastUpdated: Date.now(),
      syncErrorMargin: 1000,
    },
    members: [],
    files: [],
    chat: [],
  });

  describe('processAction', () => {
    it('should process play action', () => {
      const room = createMockRoom(false);
      const result = service.processAction(room, SyncActions.PLAY);
      expect(result.updated).toBe(true);
      expect(room.syncState.isPlaying).toBe(true);
    });

    it('should process pause action', () => {
      const room = createMockRoom(true);
      const result = service.processAction(room, SyncActions.PAUSE);
      expect(result.updated).toBe(true);
      expect(room.syncState.isPlaying).toBe(false);
    });

    it('should process seek action with valid value', () => {
      const room = createMockRoom(true);
      const result = service.processAction(room, SyncActions.SEEK, 120);
      expect(result.updated).toBe(true);
      expect(room.syncState.time).toBe(120);
    });

    it('should reject seek action with invalid value', () => {
      const room = createMockRoom(true);
      const result = service.processAction(room, SyncActions.SEEK, -1);
      expect(result.updated).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle unrecognized actions', () => {
      const room = createMockRoom(true);
      const result = service.processAction(room, 'UNKNOWN_ACTION' as any);
      expect(result.updated).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle seek action with undefined value', () => {
      const room = createMockRoom(true, 50);
      const result = service.processAction(room, SyncActions.SEEK, undefined);
      expect(result.updated).toBe(false);
      expect(result.error).toBe('Invalid seek value');
      expect(room.syncState.time).toBe(50); // Should remain unchanged
    });

    it('should handle seek action with zero value', () => {
      const room = createMockRoom(true, 50);
      const result = service.processAction(room, SyncActions.SEEK, 0);
      expect(result.updated).toBe(true);
      expect(room.syncState.time).toBe(0);
    });

    it('should not change state when toggling play to same state', () => {
      const room = createMockRoom(true); // Already playing
      const result = service.processAction(room, SyncActions.PLAY);
      expect(result.updated).toBe(true);
      expect(room.syncState.isPlaying).toBe(true); // Still playing
    });

    it('should not change state when toggling pause to same state', () => {
      const room = createMockRoom(false); // Already paused
      const result = service.processAction(room, SyncActions.PAUSE);
      expect(result.updated).toBe(true);
      expect(room.syncState.isPlaying).toBe(false); // Still paused
    });
  });

  describe('addSystemMessage', () => {
    it('should create a system message with correct format', async () => {
      // Mock the Date.toISOString() to return a consistent date for testing
      const mockDate = new Date('2023-05-15T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const roomId = 'test-room';
      const content = '👋 Alice joined the room';

      const result = await service.addSystemMessage(roomId, content);

      // Check message format
      expect(result).toEqual({
        messageId: 'mock-uuid-value',
        userId: 'system',
        username: 'System',
        content: content,
        timestamp: mockDate.toISOString(),
        systemMessage: true,
      });

      // Verify DB update was called correctly
      expect(mockRoomModel.updateOne).toHaveBeenCalledWith(
        { roomId },
        { $push: { chat: result } },
      );
    });

    it('should handle join message correctly', async () => {
      const roomId = 'test-room';
      const username = 'Alice';
      const content = `👋 ${username} joined the room`;

      await service.addSystemMessage(roomId, content);

      // Verify content format for join message
      expect(mockRoomModel.updateOne).toHaveBeenCalledWith(
        { roomId },
        expect.objectContaining({
          $push: expect.objectContaining({
            chat: expect.objectContaining({
              content,
            }),
          }),
        }),
      );
    });

    it('should handle pause message correctly', async () => {
      const roomId = 'test-room';
      const username = 'Bob';
      const timePosition = '01:23';
      const content = `⏸️ ${username} paused the video at ${timePosition}`;

      await service.addSystemMessage(roomId, content);

      // Verify content format for pause message
      expect(mockRoomModel.updateOne).toHaveBeenCalledWith(
        { roomId },
        expect.objectContaining({
          $push: expect.objectContaining({
            chat: expect.objectContaining({
              content,
            }),
          }),
        }),
      );
    });

    it('should handle database errors gracefully', async () => {
      const roomId = 'test-room';
      const content = 'Test message';

      // Mock database error
      mockRoomModel.updateOne.mockRejectedValueOnce(
        new Error('Database error'),
      );

      // Should not throw but log the error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await service.addSystemMessage(roomId, content);
        // If it doesn't throw, test passes
      } catch (error) {
        fail('Should not throw error');
      }

      consoleSpy.mockRestore();
    });
  });

  describe('getRecentMessages', () => {
    it('should retrieve recent messages up to the specified limit', async () => {
      const roomId = 'test-room';
      const limit = 50;

      const recentMessages = await service.getRecentMessages(roomId, limit);

      // Verify findOne was called with correct parameters
      expect(mockRoomModel.findOne).toHaveBeenCalledWith(
        { roomId },
        { chat: { $slice: -limit } },
      );

      // Check that returned messages match what was in the mock DB
      expect(recentMessages).toEqual([
        { messageId: 'existing-message-id', content: 'Existing message' },
      ]);
    });

    it('should return empty array if room not found', async () => {
      const roomId = 'nonexistent-room';

      // Mock findOne to return null (room not found)
      mockRoomModel.findOne.mockResolvedValueOnce(null);

      const recentMessages = await service.getRecentMessages(roomId);

      expect(recentMessages).toEqual([]);
    });

    it('should handle database query errors gracefully', async () => {
      const roomId = 'test-room';

      // Mock database error
      mockRoomModel.findOne.mockRejectedValueOnce(new Error('Database error'));

      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.getRecentMessages(roomId);

      // Should return empty array on error
      expect(result).toEqual([]);

      // Should log the error
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should use default limit of 50 if no limit is provided', async () => {
      const roomId = 'test-room';

      await service.getRecentMessages(roomId);

      // Verify findOne was called with default limit
      expect(mockRoomModel.findOne).toHaveBeenCalledWith(
        { roomId },
        { chat: { $slice: -50 } },
      );
    });

    it('should apply custom limit when provided', async () => {
      const roomId = 'test-room';
      const customLimit = 10;

      await service.getRecentMessages(roomId, customLimit);

      // Verify findOne was called with custom limit
      expect(mockRoomModel.findOne).toHaveBeenCalledWith(
        { roomId },
        { chat: { $slice: -customLimit } },
      );
    });
  });
});
