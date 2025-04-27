/**
 * Auth Module Types and Constants
 * Contains all type definitions and constants used in the auth module
 */

// Token Types
export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

// Interfaces
export interface JwtPayload {
  userId: string;
  username: string;
  email: string;
  createdAt: Date;
  type: TokenType; // Added token type to payload
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

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceInfo?: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// Constants
export const AUTH_CONSTANTS = {
  ACCESS_TOKEN_EXPIRY: '12h',
  REFRESH_TOKEN_EXPIRY: '7d',
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
  INVALID_TOKEN_TYPE: 'Invalid token type for this operation',
  REFRESH_TOKEN_INVALID: 'Invalid or expired refresh token',
  REFRESH_TOKEN_REQUIRED: 'Refresh token is required',
  REFRESH_TOKEN_REVOKED: 'Refresh token has been revoked',
  LOGOUT_SUCCESS: 'Logged out successfully',
} as const;
