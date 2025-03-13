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
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),

    // MongoDB integration for auth-related data
    MongooseModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService], // Export AuthService for use in other modules
})
export class AuthModule {}
