export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email/username or password',
  USER_NOT_FOUND: 'No account found with the provided email or username',
  INVALID_PASSWORD: 'The provided password is incorrect',
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again later',
  INVALID_TOKEN: 'The provided token is invalid',
};

export const TOKEN_CONFIG = {
  EXPIRE_IN: '24h',
};

export enum RoomStatus {
  ACTIVE = 'active', // Room is currently active
  INACTIVE = 'inactive', // Room is inactive
  ARCHIVED = 'archived', // Room has been archived
}

export enum MemberRole {
  OWNER = 'owner', // Room creator with full permissions
  ADMIN = 'admin', // Admin with elevated permissions
  MEMBER = 'member', // Standard member
  GUEST = 'guest', // Guest with limited permissions
}

export enum RoomType {
  WATCH_TOGETHER = 'watchTogether', // Room designed for synchronized video playback
  PERMANENT_GROUP = 'permanentGroup', // Permanent chat or interaction group
}

export enum SyncActions {
  PLAY = 'play',
  PAUSE = 'pause',
  SEEK = 'seek',
}
