/**
 * Authentication Controller
 *
 * Handles all authentication-related HTTP endpoints including:
 * - User registration and login
 * - Token management (verification, refresh, invalidation)
 * - User validation (username/email uniqueness checks)
 *
 * The controller implements:
 * - Rate limiting to prevent abuse
 * - Error handling for consistent error responses
 * - Request logging for debugging and monitoring
 * - Secure token management
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpStatus,
  UseInterceptors,
  Logger,
  Param,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from '../dto';
import { Response, Request } from 'express';
import { RateLimitInterceptor } from './interceptors/rate-limit.interceptor';
import { ErrorHandlingInterceptor } from './interceptors/error-handling.interceptor';
import { AUTH_ERROR_MESSAGES, TokenType } from './auth.types';

@Controller('auth')
@UseInterceptors(RateLimitInterceptor, ErrorHandlingInterceptor) // Apply interceptors for rate limiting and error handling
export class AuthController {
  /**
   * Logger instance for tracking authentication operations
   * Used for debugging and monitoring authentication-related issues
   */
  private readonly logger = new Logger(AuthController.name); // Logger for debugging and tracking

  constructor(private readonly authService: AuthService) {}

  /**
   * User Login
   * - Validates credentials
   * - Returns JWT token and user data
   */
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const { emailOrUsername, password } = loginDto;
      const user = await this.authService.validateUser(
        emailOrUsername,
        password,
      );

      // Extract device info from headers or request
      const deviceInfo = this.extractDeviceInfo(req);

      const loginResponse = await this.authService.login(user, deviceInfo);
      return res.status(HttpStatus.OK).json(loginResponse);
    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`, error.stack);
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
      });
    }
  }

  /**
   * User Registration
   * - Creates new user account
   * - Returns JWT token and user data
   */
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const response = await this.authService.registerUser(registerDto);
      return res.status(HttpStatus.CREATED).json(response);
    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`, error.stack);
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Registration failed',
      });
    }
  }

  /**
   * User Logout
   * - Invalidates current token
   * - Removes user session
   */
  @Get('logout')
  async logout(@Req() req: Request, @Res() res: Response): Promise<Response> {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) await this.authService.invalidateToken(token);
      return res
        .status(HttpStatus.OK)
        .json({ message: 'Logged out successfully' });
    } catch (error) {
      this.logger.error(`Logout failed: ${error.message}`, error.stack);
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Logout failed',
      });
    }
  }

  /**
   * Token Verification
   * - Validates current token
   * - Returns user data if valid
   */
  @Get('verify-token')
  async verifyToken(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      this.logger.debug('Verify token request received');
      const authHeader = req.headers.authorization;
      this.logger.debug(`Authorization header: ${authHeader}`);

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        this.logger.warn('Invalid authorization header format');
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: AUTH_ERROR_MESSAGES.TOKEN_MISSING,
        });
      }

      const token = authHeader.split(' ')[1];
      this.logger.debug('Token extracted from header');

      // Verify the token as an access token specifically
      const isValid = await this.authService.isTokenValid(
        token,
        TokenType.ACCESS,
      );
      this.logger.debug(`Token validity check result: ${isValid}`);

      if (!isValid) {
        this.logger.warn('Token validation failed');
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: AUTH_ERROR_MESSAGES.TOKEN_INVALID,
        });
      }

      const user = await this.authService.getUserFromToken(
        token,
        TokenType.ACCESS,
      );
      this.logger.debug(`User retrieved from token: ${JSON.stringify(user)}`);

      return res.status(HttpStatus.OK).json({
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      this.logger.error(
        `Token verification failed: ${error.message}`,
        error.stack,
      );

      if (error instanceof UnauthorizedException) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: error.message,
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'An error occurred while verifying the token',
      });
    }
  }

  /**
   * Token Refresh
   * - Validates refresh token
   * - Issues new access token and refresh token
   */
  @Post('refresh-token')
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      // Get token from request body (preferred) or fallback to Authorization header
      let refreshToken = refreshTokenDto?.refreshToken;

      if (!refreshToken) {
        // Fallback to Authorization header
        refreshToken = req.headers.authorization?.split(' ')[1];
      }

      if (!refreshToken) {
        throw new BadRequestException(
          AUTH_ERROR_MESSAGES.REFRESH_TOKEN_REQUIRED,
        );
      }

      // Extract device info
      const deviceInfo =
        refreshTokenDto.deviceInfo || this.extractDeviceInfo(req);

      // Refresh tokens using the service
      const tokens = await this.authService.refreshTokens(
        refreshToken,
        deviceInfo,
      );

      return res.status(HttpStatus.OK).json(tokens);
    } catch (error) {
      this.logger.error(`Refresh token failed: ${error.message}`, error.stack);

      if (error instanceof BadRequestException) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: error.message,
        });
      }

      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: error.message || AUTH_ERROR_MESSAGES.REFRESH_TOKEN_INVALID,
      });
    }
  }

  /**
   * Username Availability Check
   * - Validates username uniqueness
   */
  @Get('check-username/:username')
  async checkUsername(
    @Param('username') username: string,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const isUsernameUnique =
        await this.authService.isUsernameUnique(username);
      return res.status(HttpStatus.OK).json({ isUnique: isUsernameUnique });
    } catch (error) {
      this.logger.error(`Username check failed: ${error.message}`, error.stack);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Error checking username availability',
      });
    }
  }

  /**
   * Email Availability Check
   * - Validates email uniqueness
   */
  @Get('check-email/:email')
  async checkEmail(
    @Param('email') email: string,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const isEmailUnique = await this.authService.isEmailUnique(email);
      return res.status(HttpStatus.OK).json({ isUnique: isEmailUnique });
    } catch (error) {
      this.logger.error(`Email check failed: ${error.message}`, error.stack);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Error checking email availability',
      });
    }
  }

  /**
   * Helper to extract device info from request
   */
  private extractDeviceInfo(req: Request): string {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `${userAgent} - ${ip}`;
  }
}
