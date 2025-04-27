/**
 * Authentication Service
 * Handles user authentication, token management, and security operations.
 */

import {
  Injectable,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  UnauthorizedException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { RegisterDto } from '../dto';
import * as bcrypt from 'bcrypt';
import {
  AUTH_CONSTANTS,
  AUTH_ERROR_MESSAGES,
  AuthResponse,
  JwtPayload,
  TokenType,
  RefreshTokenResponse,
} from './auth.types';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * In-memory storage for invalidated tokens
   * TODO: Consider moving to Redis or a database for production use
   * to handle distributed systems and server restarts
   */
  private invalidatedTokens: Set<string> = new Set();

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * User Registration
   * - Validates email uniqueness
   * - Hashes password
   * - Creates user
   * - Generates JWT tokens
   */
  async registerUser(registerDto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.userService.findOneByEmail(
      registerDto.email,
    );
    if (existingUser) {
      throw new HttpException(
        AUTH_ERROR_MESSAGES.EMAIL_EXISTS,
        HttpStatus.CONFLICT,
      );
    }

    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      AUTH_CONSTANTS.PASSWORD_SALT_ROUNDS,
    );
    const newUser = await this.userService.createUser({
      ...registerDto,
      password: hashedPassword,
    });

    const accessToken = this.generateToken(newUser, TokenType.ACCESS);
    const refreshToken = this.generateToken(newUser, TokenType.REFRESH);

    // Store refresh token in database
    await this.refreshTokenService.createRefreshToken(
      newUser.userId,
      refreshToken,
    );

    return {
      accessToken,
      refreshToken,
      user: this.getPublicUser(newUser),
    };
  }

  /**
   * User Authentication
   * - Validates credentials
   * - Returns user data if valid
   */
  async validateUser(emailOrUsername: string, password: string) {
    const user = await this.userService.findByEmailOrUsername(emailOrUsername);
    if (!user)
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid)
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);

    return user;
  }

  /**
   * User Login
   * - Generates access and refresh tokens
   * - Returns user data and tokens
   */
  async login(user: any, deviceInfo?: string): Promise<AuthResponse> {
    const accessToken = this.generateToken(user, TokenType.ACCESS);
    const refreshToken = this.generateToken(user, TokenType.REFRESH);

    // Store refresh token in database
    await this.refreshTokenService.createRefreshToken(
      user.userId,
      refreshToken,
      deviceInfo,
    );

    return {
      accessToken,
      refreshToken,
      user: this.getPublicUser(user),
    };
  }

  /**
   * Token Management
   * - Verifies token before blacklisting
   * - Handles token invalidation for logout
   */
  async invalidateToken(token: string): Promise<void> {
    if (!token) {
      throw new HttpException(
        AUTH_ERROR_MESSAGES.TOKEN_REQUIRED,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // Verify the token first
      const decoded = await this.jwtService.verifyAsync(token);
      this.invalidatedTokens.add(token);

      // If it's a refresh token, also invalidate it in the database
      if (decoded.type === TokenType.REFRESH) {
        await this.refreshTokenService.revokeRefreshToken(token);
      }
    } catch (err) {
      this.logger.error(`Token invalidation failed: ${err.message}`);
      throw new HttpException(
        AUTH_ERROR_MESSAGES.TOKEN_INVALID,
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Token Validation
   * - Checks blacklist
   * - Verifies token signature
   * - Verifies token type is appropriate for the operation
   */
  async isTokenValid(
    token: string,
    expectedType?: TokenType,
  ): Promise<boolean> {
    this.logger.debug('Checking token validity');
    if (this.invalidatedTokens.has(token)) {
      this.logger.warn('Token found in blacklist');
      return false;
    }

    try {
      const decoded = await this.jwtService.verifyAsync(token);

      // Check if token type matches expected type, if provided
      if (expectedType && decoded.type !== expectedType) {
        this.logger.warn(
          `Token type mismatch: expected ${expectedType}, got ${decoded.type}`,
        );
        return false;
      }

      // If it's a refresh token, also check if it's valid in the database
      if (decoded.type === TokenType.REFRESH) {
        const isActive =
          await this.refreshTokenService.isRefreshTokenActive(token);
        if (!isActive) {
          this.logger.warn('Refresh token is not active in database');
          return false;
        }
      }

      this.logger.debug('Token signature verified successfully');
      return true;
    } catch (err) {
      this.logger.warn(`Token verification failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Token to User Resolution
   * - Validates token and checks blacklist
   * - Retrieves and validates user
   */
  async getUserFromToken(
    token: string,
    expectedType?: TokenType,
  ): Promise<JwtPayload> {
    try {
      this.logger.debug('Getting user from token');
      if (!token) {
        this.logger.warn('Token is missing');
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.TOKEN_MISSING);
      }
      // Check if the token has been invalidated
      if (this.invalidatedTokens.has(token)) {
        this.logger.warn('Token is blacklisted');
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.TOKEN_INVALID);
      }

      // Decode and verify the token
      const decoded = await this.jwtService.verifyAsync(token);
      this.logger.debug(
        `Token decoded successfully: ${JSON.stringify(decoded)}`,
      );

      // Check token type if expected type is provided
      if (expectedType && decoded.type !== expectedType) {
        this.logger.warn(
          `Token type mismatch: expected ${expectedType}, got ${decoded.type}`,
        );
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_TOKEN_TYPE);
      }

      // If it's a refresh token, check if it's active in the database
      if (decoded.type === TokenType.REFRESH) {
        const isActive =
          await this.refreshTokenService.isRefreshTokenActive(token);
        if (!isActive) {
          this.logger.warn('Refresh token is not active');
          throw new UnauthorizedException(
            AUTH_ERROR_MESSAGES.REFRESH_TOKEN_REVOKED,
          );
        }
      }

      const user = await this.userService.findOneById(decoded.userId);
      this.logger.debug(`User lookup result: ${user ? 'Found' : 'Not found'}`);

      // Check if user exists
      if (!user) {
        this.logger.warn('User not found for token');
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.USER_NOT_FOUND);
      }

      return {
        userId: user.userId,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        type: decoded.type,
      };
    } catch (err) {
      this.logger.error(
        `Error getting user from token: ${err.message}`,
        err.stack,
      );
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.TOKEN_INVALID);
    }
  }

  /**
   * Token Refresh
   * - Validates refresh token
   * - Generates new access token and refresh token
   * - Revokes the old refresh token
   */
  async refreshTokens(
    refreshToken: string,
    deviceInfo?: string,
  ): Promise<RefreshTokenResponse> {
    try {
      if (!refreshToken) {
        throw new BadRequestException(
          AUTH_ERROR_MESSAGES.REFRESH_TOKEN_REQUIRED,
        );
      }

      // Verify refresh token is of correct type and valid
      const isValid = await this.isTokenValid(refreshToken, TokenType.REFRESH);
      if (!isValid) {
        throw new UnauthorizedException(
          AUTH_ERROR_MESSAGES.REFRESH_TOKEN_INVALID,
        );
      }

      // Get user from token
      const decoded = await this.getUserFromToken(
        refreshToken,
        TokenType.REFRESH,
      );

      // Fetch user using decoded data
      const user = await this.userService.findOneById(decoded.userId);
      if (!user) {
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.USER_NOT_FOUND);
      }

      // Generate new tokens
      const newAccessToken = this.generateToken(user, TokenType.ACCESS);
      const newRefreshToken = this.generateToken(user, TokenType.REFRESH);

      // Store new refresh token and revoke old one
      await this.refreshTokenService.createRefreshToken(
        user.userId,
        newRefreshToken,
        deviceInfo,
      );
      await this.refreshTokenService.revokeRefreshToken(
        refreshToken,
        newRefreshToken,
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (err) {
      this.logger.error(`Token refresh failed: ${err.message}`);
      if (
        err instanceof UnauthorizedException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new UnauthorizedException(
        AUTH_ERROR_MESSAGES.REFRESH_TOKEN_INVALID,
      );
    }
  }

  /**
   * JWT Token Generation
   * - Creates payload with user data and token type
   * - Signs token with configured expiry
   */
  private generateToken(user: any, type: TokenType): string {
    try {
      const payload: JwtPayload = {
        userId: user.userId,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        type,
      };

      const expiresIn =
        type === TokenType.ACCESS
          ? AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY
          : AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY;

      return this.jwtService.sign(payload, { expiresIn });
    } catch (err) {
      this.logger.error(`Token generation failed: ${err.message}`);
      throw new InternalServerErrorException('Failed to generate token');
    }
  }

  /**
   * Public User Data
   * - Removes sensitive information
   */
  private getPublicUser(user: any): AuthResponse['user'] {
    return {
      userId: user.userId,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  /**
   * Username Uniqueness Check
   */
  async isUsernameUnique(username: string): Promise<boolean> {
    const user = await this.userService.findOneByUsername(username);
    return !user;
  }

  /**
   * Email Uniqueness Check
   */
  async isEmailUnique(email: string): Promise<boolean> {
    const user = await this.userService.findOneByEmail(email);
    return !user;
  }
}
