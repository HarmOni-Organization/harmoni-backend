// File information for each user
export interface FileInfo {
  fileHash: string;        // Hash of the file to verify if users are using the same video
  fileSize: number;        // Size of the video file in bytes
  videoId: string;         // Unique video ID for tracking the video
  title: string;           // Video title
  duration: number;        // Duration of the video in seconds
  filePath?: string;       // Optional: File path (local storage)
  fileFormat?: string;     // Optional: Format of the video file (e.g., .mp4, .mkv)
  lastModified?: string;   // Optional: Last modified timestamp for the video file
}

// User information for each room member
export interface UserInfo {
  userId: string;          // Unique user ID
  username: string;        // User's display name
  isHost: boolean;         // Indicates whether this user is the host of the room
  fileInfo: FileInfo;      // Information about the video file the user is using
  isTyping?: boolean;      // Indicates whether the user is currently typing in the chat
  playbackSpeed?: number;  // Optional: Playback speed of the video for the user (e.g., 1x, 1.25x)
  subtitlesEnabled?: boolean; // Optional: Whether the user has subtitles enabled
}

// Room sync information (e.g., video sync state)
export interface SyncInfo {
  time: number;            // Current video time in seconds
  isPlaying: boolean;      // Whether the video is currently playing
  syncErrorMargin: number; // Allowable sync error margin between users
}

// Room state information
export interface RoomInfo {
  roomName: string;        // The name of the room
  ownerId: string;         // ID of the room owner
  isArchived: boolean;     // Indicates whether the room is archived
  createdAt: string;       // Timestamp of when the room was created
  maxParticipants?: number; // Optional: Maximum number of participants in the room
  passwordProtected?: boolean; // Optional: Whether the room is password-protected
  roomPassword?: string;   // Optional: Room password, if applicable
}

// Combined room state
export interface RoomState {
  syncInfo: SyncInfo;      // Sync information for the room
  roomInfo: RoomInfo;      // General information about the room
}
