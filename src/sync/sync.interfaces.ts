import { RoomStatus, RoomType, MemberRole } from 'src/constants';

// Main WT Room Interface
export interface Room {
  roomId: string; // Unique identifier for the room
  roomInfo: RoomInfo; // Metadata and status of the room
  syncState: SyncState; // Synchronization state of the video
  members: RoomMember[]; // List of room members
  files: FileInfo[]; // List of files related to the room
  chat: ChatMessage[]; // List of chat messages in the room
}

// Room Metadata and Status
export interface RoomInfo {
  name?: string; // Optional, user-defined room name
  description?: string; // Optional room description
  ownerId: string; // ID of the room owner
  isPrivate: boolean; // Indicates if the room is private
  status: RoomStatus; // Current status of the room (active/inactive)
  createdAt: number; // Timestamp when the room was created
  lastActivity: number; // Timestamp of the last room activity
  roomType: RoomType; // Type of room (e.g., watchTogether, permanentGroup)
}

// Synchronization State
export interface SyncState {
  time: number; // Current playback time in seconds
  isPlaying: boolean; // Playback state
  lastUpdated: number; // Timestamp of the last sync update
  syncErrorMargin: number; // Allowable error margin in milliseconds
}

// Room Member Details
export interface RoomMember {
  userId: string; // Unique identifier for the user
  username: string; // Display name of the user
  clientId: string; // Socket id connection for the user
  active: boolean; // Indicates if the user is active
  role: MemberRole; // Role of the member in the room
  typing: boolean; // Indicates if the user is currently typing
  lastActivity: number; // Timestamp of the user's last activity
}

// File Information
export interface FileInfo {
  fileId: string; // Unique identifier for the file
  userId: string; // Reference to the user who owns the file
  name: string; // File name
  fullTime: number; // Total duration of the file in seconds
  hash: string; // File hash for verification
}

// Chat Message Structure
export interface ChatMessage {
  messageId: string; // Unique identifier for the message
  userId: string; // ID of the user who sent the message
  username: string; // Display name of the sender
  content: string; // Message content
  timestamp: string; // ISO timestamp of when the message was sent
  systemMessage?: boolean; // Optional flag for system messages (e.g., "User joined")
  replyTo?: string; // Message ID of the message being replied to
  edited?: boolean; // Indicates if the message was edited
  deleted?: boolean; // Indicates if the message was deleted
}
