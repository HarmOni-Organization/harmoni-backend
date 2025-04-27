import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RefreshToken } from '../schemas/refresh-token.schema';
import { AUTH_CONSTANTS } from './auth.types';

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshToken>,
  ) {}

  /**
   * Create a new refresh token in the database
   */
  async createRefreshToken(
    userId: string,
    token: string,
    deviceInfo?: string,
  ): Promise<RefreshToken> {
    this.logger.debug(`Creating refresh token for user: ${userId}`);

    // Calculate expiration date
    const expiresIn = 1000 * 60 * 60 * 24 * 7; // 7 days in milliseconds
    const expiresAt = new Date(Date.now() + expiresIn);

    // Create the token
    const refreshToken = new this.refreshTokenModel({
      token,
      userId,
      deviceInfo: deviceInfo || 'unknown',
      expiresAt,
      revoked: false,
    });

    return refreshToken.save();
  }

  /**
   * Find a refresh token by token value
   */
  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    return this.refreshTokenModel.findOne({ token }).exec();
  }

  /**
   * Revoke a refresh token
   */
  async revokeRefreshToken(
    token: string,
    replacedByToken?: string,
  ): Promise<RefreshToken | null> {
    const refreshToken = await this.refreshTokenModel.findOne({ token }).exec();

    if (!refreshToken) {
      return null;
    }

    // Update the token as revoked
    refreshToken.revoked = true;
    refreshToken.revokedAt = new Date();

    if (replacedByToken) {
      refreshToken.replacedByToken = replacedByToken;
    }

    return refreshToken.save();
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserRefreshTokens(userId: string): Promise<boolean> {
    const result = await this.refreshTokenModel
      .updateMany(
        { userId, revoked: false },
        { revoked: true, revokedAt: new Date() },
      )
      .exec();

    return result.modifiedCount > 0;
  }

  /**
   * Check if a refresh token is active
   */
  async isRefreshTokenActive(token: string): Promise<boolean> {
    const refreshToken = await this.refreshTokenModel.findOne({ token }).exec();

    if (!refreshToken) {
      return false;
    }

    // Check if token is not revoked and not expired
    return !refreshToken.revoked && refreshToken.expiresAt > new Date();
  }

  /**
   * Remove expired tokens (cleanup job)
   */
  async removeExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenModel
      .deleteMany({
        expiresAt: { $lt: new Date() },
      })
      .exec();

    return result.deletedCount;
  }
}
