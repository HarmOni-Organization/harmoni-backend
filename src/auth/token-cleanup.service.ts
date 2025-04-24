import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(private readonly refreshTokenService: RefreshTokenService) {}

  /**
   * Clean up expired tokens daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleTokenCleanup() {
    this.logger.log('Starting expired token cleanup');

    try {
      const deletedCount = await this.refreshTokenService.removeExpiredTokens();
      this.logger.log(`Removed ${deletedCount} expired tokens`);
    } catch (error) {
      this.logger.error(
        `Error cleaning up expired tokens: ${error.message}`,
        error.stack,
      );
    }
  }
}
