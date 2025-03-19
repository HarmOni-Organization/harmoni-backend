import { Socket } from 'socket.io';
import { Room } from 'src/schemas/room.schema';

export class RoomAccessMiddleware {
  constructor(private readonly rooms: Record<string, Room>) {}

  validateAccess(client: Socket, roomId: string): boolean {
    const { userId } = client.data.user;

    if (!userId) {
      console.warn(
        `Unauthorized access attempt: client ${client.id} has no user ID`,
      );
      return false;
    }

    const room = this.rooms[roomId];
    if (!room) {
      console.warn(`Room ${roomId} does not exist`);
      return false;
    }

    const isMember = room.members.some((member) => member.userId === userId);
    if (!isMember) {
      console.warn(`User ${userId} is not a member of room ${roomId}`);
      return false;
    }

    return true;
  }
}
