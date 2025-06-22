import { Module } from '@nestjs/common';
import { SyncGateway } from './sync.gateway';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Room, RoomSchema } from 'src/schemas/room.schema';
import { ValidateRoomAccessGuard } from 'src/guards/sync.roomAccess.guard';
import { SyncService } from './sync.service';
import { Message, MessageSchema } from './schemas/message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  providers: [
    {
      provide: 'ROOMS',
      useValue: {}, // In-memory rooms object
    },
    SyncGateway,
    {
      provide: ValidateRoomAccessGuard,
      useFactory: (rooms: Record<string, Room>) =>
        new ValidateRoomAccessGuard(rooms),
      inject: ['ROOMS'],
    },
    AuthMiddleware,
    JwtService,
    SyncService,
  ],
  exports: [SyncService],
})
export class SyncModule {}
