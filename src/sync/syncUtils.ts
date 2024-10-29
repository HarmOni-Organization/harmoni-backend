// syncUtils.ts

import { UserInfo, RoomState } from './types'; // Assuming UserInfo and RoomState are defined in a shared types file

// Generate a room ID in XXXX-XXXX format
export function generateRoomId(): string {
  const randomSegment = () => Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${randomSegment()}-${randomSegment()}`;
}

// Check for file consistency among room members
export function checkFileConsistency(roomUsers: UserInfo[]): boolean {
  const firstFileInfo = roomUsers?.[0]?.fileInfo;
  if (!firstFileInfo) return true;

  return roomUsers.every(user =>
    user.fileInfo.fileHash === firstFileInfo.fileHash && user.fileInfo.fileSize === firstFileInfo.fileSize
  );
}

// Get the full room state (combine room state and users)
export function getRoomState(
  roomStates: Record<string, RoomState>, 
  roomUsers: Record<string, UserInfo[]>, 
  roomId: string
): RoomState & { users: UserInfo[] } | null {
  const roomState = roomStates[roomId];
  const users = roomUsers[roomId] || [];
  if (roomState) {
    return { ...roomState, users };
  }
  return null;
}

// Update the 'isTyping' status of a user
export function updateUserTypingStatus(userInfo: UserInfo, isTyping: boolean): void {
  userInfo.isTyping = isTyping;
}
