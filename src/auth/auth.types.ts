/**
 * Auth Module Types and Constants
 * Contains all type definitions and constants used in the auth module
 */

// Interfaces
export interface JwtPayload {
  userId: string;
  username: string;
  email: string;
  createdAt: Date;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    userId: string;
    username: string;
    email: string;
    createdAt: Date;
  };
}

export interface TokenValidationResponse {
  isValid: boolean;
  user?: {
    userId: string;
    username: string;
    email: string;
    createdAt: Date;
  };
}

// Constants
export const AUTH_CONSTANTS = {
  TOKEN_EXPIRY: '1h',
  PASSWORD_SALT_ROUNDS: 10,
  TOKEN_BLACKLIST_TTL: 24 * 60 * 60 * 1000, // 24 hours
} as const;

export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email/username or password',
  TOKEN_MISSING: 'Authorization token is missing',
  TOKEN_INVALID: 'Invalid or expired token',
  TOKEN_REQUIRED: 'Token is required for logout',
  USER_NOT_FOUND: 'User not found',
  EMAIL_EXISTS: 'Email is already in use',
  USERNAME_EXISTS: 'Username is already in use',
} as const;
