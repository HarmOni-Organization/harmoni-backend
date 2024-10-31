// File information associated with each user
export interface FileInfo {
  fileHash: string;            // Hash for verifying if all users have the same video
  fileSize: number;            // Size of the video file in bytes
  videoId: string;             // Unique identifier for tracking the video
  title: string;               // Title of the video
  duration: number;            // Duration of the video in seconds
  filePath?: string;           // Optional: Local file path for the video
  fileFormat?: string;         // Optional: File format (e.g., .mp4, .mkv)
  lastModified?: string;       // Optional: Last modified timestamp for the video file
  resolution?: string;         // Optional: Resolution of the video (e.g., 1080p)
  codec?: string;              // Optional: Codec used for the video file (e.g., H.264)
}

// Information for each room participant
export interface UserInfo {
  userId: string;              // Unique identifier for the user
  username: string;            // Display name for the user
  isHost: boolean;             // Indicates if the user is the host of the room
  fileInfo: FileInfo;          // Information about the video file the user is watching
  isTyping?: boolean;          // Optional: Typing status for chat interactions
  playbackSpeed?: number;      // Optional: Video playback speed (e.g., 1x, 1.25x)
  subtitlesEnabled?: boolean;  // Optional: Whether the user has subtitles enabled
  userAvatar?: string;         // Optional: URL or path to the user's avatar image
  connectionStatus?: 'online' | 'offline'; // Optional: User’s current connection status
}

// Sync information for the room's video playback
export interface SyncInfo {
  time: number;                // Current playback time in seconds
  isPlaying: boolean;          // Indicates if the video is currently playing
  syncErrorMargin: number;     // Allowable sync error margin in seconds
  playbackRate?: number;       // Optional: Room-wide playback rate (e.g., 1x, 1.5x)
}

// Information about the room's settings and status
export interface RoomInfo {
  roomName: string;            // Name of the room
  ownerId: string;             // ID of the room owner
  isArchived: boolean;         // Indicates if the room is archived
  createdAt: string;           // Creation timestamp for the room
  maxParticipants?: number;    // Optional: Max number of participants allowed
  passwordProtected?: boolean; // Optional: If the room is password-protected
  roomPassword?: string;       // Optional: Password for the room
  description?: string;        // Optional: Room description or purpose
  tags?: string[];             // Optional: Tags to categorize the room (e.g., "movie night")
}

// Combined state of the room, including sync and general information
export interface RoomState {
  syncInfo: SyncInfo;          // Sync information for playback
  roomInfo: RoomInfo;          // General information about the room
}
