import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { Socket } from 'socket.io';
import { Room } from '../sync/sync.interfaces';

@Injectable()
export class ValidateRoomAccessGuard implements CanActivate {
  constructor(
    @Inject('ROOMS') private readonly rooms: Record<string, Room>, // Inject the rooms object
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const data: { roomId: string } = context.switchToWs().getData();

    const userId = client.data?.user?.userId;
    const { roomId } = data;

    if (!userId) {
      console.warn(`[AccessGuard] Client ${client.id} has no user ID`);
      return false;
    }

    const room = this.rooms[roomId];
    if (!room) {
      console.warn(`[AccessGuard] Room ${roomId} does not exist`);
      return false;
    }

    const isMember = room.members.some((member) => member.userId === userId);
    if (!isMember) {
      console.warn(
        `[AccessGuard] User ${userId} is not a member of room ${roomId}`,
      );
      return false;
    }

    console.log(`[AccessGuard] User ${userId} validated for room ${roomId}`);
    return true;
  }
}
