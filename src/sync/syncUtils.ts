import { UserInfo, RoomState } from './types';

/**
 * Generates a unique room ID in the format XXXX-XXXX.
 * @returns {string} The generated room ID.
 */
export function generateRoomId(): string {
  const generateSegment = () => Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${generateSegment()}-${generateSegment()}`;
}

/**
 * Checks for file consistency among room members to ensure all users are using the same video file.
 * Consistency is determined by comparing the fileHash and fileSize of each user's fileInfo.
 * @param {UserInfo[]} roomUsers - Array of user information objects within a room.
 * @returns {boolean} `true` if all users have matching file information, `false` otherwise.
 */
export function checkFileConsistency(roomUsers: UserInfo[]): boolean {
  const referenceFile = roomUsers?.[0]?.fileInfo;
  if (!referenceFile) return true;

  return roomUsers.every(user =>
    user.fileInfo.fileHash === referenceFile.fileHash && 
    user.fileInfo.fileSize === referenceFile.fileSize
  );
}

/**
 * Retrieves the full state of a room, combining the room's state and list of users.
 * Useful for broadcasting current room conditions.
 * @param {Record<string, RoomState>} roomStates - Collection of all room states.
 * @param {Record<string, UserInfo[]>} roomUsers - Collection of users in each room.
 * @param {string} roomId - ID of the room to retrieve.
 * @returns {RoomState & { users: UserInfo[] } | null} The full state of the room or null if room doesn't exist.
 */
export function getRoomState(
  roomStates: Record<string, RoomState>, 
  roomUsers: Record<string, UserInfo[]>, 
  roomId: string
): RoomState & { users: UserInfo[] } | null {
  const roomState = roomStates[roomId];
  const users = roomUsers[roomId] || [];
  return roomState ? { ...roomState, users } : null;
}

/**
 * Updates the 'isTyping' status of a specific user within a room.
 * Useful for indicating to other users when someone is actively typing.
 * @param {UserInfo} user - The user object to update.
 * @param {boolean} isTyping - The user's current typing status.
 */
export function updateUserTypingStatus(user: UserInfo, isTyping: boolean): void {
  user.isTyping = isTyping;
}
