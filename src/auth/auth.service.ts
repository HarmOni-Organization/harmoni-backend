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
} from './auth.types';

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

    return {
      accessToken: this.generateToken(newUser),
      refreshToken: this.generateToken(newUser, true),
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
  login(user: any): AuthResponse {
    return {
      accessToken: this.generateToken(user),
      refreshToken: this.generateToken(user, true),
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
      await this.jwtService.verifyAsync(token);
      this.invalidatedTokens.add(token);
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
   */
  async isTokenValid(token: string): Promise<boolean> {
    this.logger.debug('Checking token validity');
    if (this.invalidatedTokens.has(token)) {
      this.logger.warn('Token found in blacklist');
      return false;
    }
    try {
      await this.jwtService.verifyAsync(token);
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
  async getUserFromToken(token: string): Promise<JwtPayload> {
    try {
      this.logger.debug('Getting user from token');
      if (!token) {
        this.logger.warn('Token is missing');
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.TOKEN_MISSING);
      }
      if (this.invalidatedTokens.has(token)) {
        this.logger.warn('Token is blacklisted');
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.TOKEN_INVALID);
      }

      const decoded = await this.jwtService.verifyAsync(token);
      this.logger.debug(
        `Token decoded successfully: ${JSON.stringify(decoded)}`,
      );

      const user = await this.userService.findOneById(decoded.userId);
      this.logger.debug(`User lookup result: ${user ? 'Found' : 'Not found'}`);

      if (!user) {
        this.logger.warn('User not found for token');
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.USER_NOT_FOUND);
      }

      const result = {
        userId: user.userId,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      };
      this.logger.debug(`Returning user data: ${JSON.stringify(result)}`);
      return result;
    } catch (err) {
      this.logger.error(
        `Error getting user from token: ${err.message}`,
        err.stack,
      );
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.TOKEN_INVALID);
    }
  }

  /**
   * Token Refresh
   * - Validates refresh token
   * - Generates new access token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      if (!refreshToken)
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.TOKEN_MISSING);

      const decoded = await this.jwtService.verifyAsync(refreshToken);
      const user = await this.userService.findOneById(decoded.userId);

      if (!user)
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.USER_NOT_FOUND);

      return this.generateToken(user);
    } catch (err) {
      this.logger.error(`Token refresh failed: ${err.message}`);
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.TOKEN_INVALID);
    }
  }

  /**
   * JWT Token Generation
   * - Creates payload with user data
   * - Signs token with configured expiry
   */
  private generateToken(user: any, isRefreshToken = false): string {
    try {
      const payload: JwtPayload = {
        userId: user.userId,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      };
      return this.jwtService.sign(payload, {
        expiresIn: isRefreshToken ? '7d' : AUTH_CONSTANTS.TOKEN_EXPIRY,
      });
    } catch (err) {
      this.logger.error(`Token generation failed: ${err.message}`);
      throw new InternalServerErrorException('Failed to generate token');
    }
  }

  /**
   * Public User Data
   * - Removes sensitive information
   * - Returns sanitized user object
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
   * Username Validation
   * - Checks if username is available
   */
  async isUsernameUnique(username: string): Promise<boolean> {
    try {
      const user = await this.userService.findOneByUsername(username);
      return !user;
    } catch (err) {
      this.logger.error(`Error checking username uniqueness: ${err.message}`);
      throw new InternalServerErrorException(
        'Error checking username uniqueness',
      );
    }
  }

  /**
   * Email Validation
   * - Checks if email is available
   */
  async isEmailUnique(email: string): Promise<boolean> {
    try {
      const user = await this.userService.findOneByEmail(email);
      return !user;
    } catch (err) {
      this.logger.error(`Error checking email uniqueness: ${err.message}`);
      throw new InternalServerErrorException('Error checking email uniqueness');
    }
  }
}
