/**
 * Authentication Module
 *
 * This module handles all authentication-related functionality including:
 * - User authentication (login, registration)
 * - JWT token generation and validation
 * - User session management
 * - Authentication middleware
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  RefreshToken,
  RefreshTokenSchema,
} from '../schemas/refresh-token.schema';
import { RefreshTokenService } from './refresh-token.service';
import { AuthMiddleware } from './auth.middleware';
import { TokenCleanupService } from './token-cleanup.service';
import { AUTH_CONSTANTS } from './auth.types';

@Module({
  imports: [
    // Import UserModule to access user-related functionality
    UserModule,

    /**
     * JWT Module Configuration
     * - Uses async configuration to load JWT secret from environment variables
     * - Sets token expiration to 1 hour
     */
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY },
      }),
    }),

    // MongoDB integration for auth-related data
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshTokenService,
    AuthMiddleware,
    TokenCleanupService,
  ],
  exports: [AuthService, RefreshTokenService, AuthMiddleware],
})
export class AuthModule {}
