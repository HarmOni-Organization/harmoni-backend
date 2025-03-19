import { Test, TestingModule } from '@nestjs/testing';
import { SyncActionProcessor } from './sync.service';
import { SyncActions, RoomStatus, RoomType } from '../constants';
import { Room } from './sync.interfaces';

describe('SyncActionProcessor', () => {
  let service: SyncActionProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SyncActionProcessor],
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
  });
});
