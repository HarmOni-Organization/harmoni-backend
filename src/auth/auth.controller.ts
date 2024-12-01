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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from '../dto';
import { Response, Request } from 'express';
import { RateLimitInterceptor } from './interceptors/rate-limit.interceptor';
import { ErrorHandlingInterceptor } from './interceptors/error-handling.interceptor';

@Controller('auth')
@UseInterceptors(RateLimitInterceptor, ErrorHandlingInterceptor) // Apply interceptors for rate limiting and error handling
export class AuthController {
  private readonly logger = new Logger(AuthController.name); // Logger for debugging and tracking

  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint for user login.
   * Validates user credentials and returns a JWT token upon success.
   * @param loginDto - Contains email/username and password.
   * @param res - HTTP response object.
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    try {
      const { emailOrUsername, password } = loginDto;
      const user = await this.authService.validateUser(
        emailOrUsername,
        password,
      ); // Validate user credentials
      const loginResponse = this.authService.login(user); // Generate token and user data
      return res.status(HttpStatus.OK).json(loginResponse);
    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`, error.stack); // Log the error details
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Login failed',
      });
    }
  }

  /**
   * Endpoint for user registration.
   * Creates a new user and returns a JWT token upon success.
   * @param registerDto - Registration details from the client.
   * @param res - HTTP response object.
   */
  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Res() res: Response) {
    try {
      const { user, token } = await this.authService.registerUser(registerDto); // Register user
      return res.status(HttpStatus.CREATED).json({ accessToken: token, user });
    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`, error.stack); // Log the error details
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Registration failed',
      });
    }
  }

  /**
   * Logs out the user by invalidating the token.
   * @param req - HTTP request object containing the token.
   * @param res - HTTP response object.
   */
  @Get('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1]; // Extract token from Authorization header
      if (token) await this.authService.invalidateToken(token); // Invalidate the token
      return res
        .status(HttpStatus.OK)
        .json({ message: 'Logged out successfully' });
    } catch (error) {
      this.logger.error(`Logout failed: ${error.message}`, error.stack); // Log the error details
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Logout failed',
      });
    }
  }

  /**
   * Verifies the validity of a given JWT token.
   * @param req - HTTP request object containing the token.
   * @param res - HTTP response object.
   */
  @Get('verify-token')
  async verifyToken(@Req() req: Request, @Res() res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1]; // Extract token
      const isValid = await this.authService.isTokenValid(token); // Check validity
      if (!isValid) throw new Error('Invalid or expired token');

      const user = await this.authService.getUserFromToken(token); // Decode and fetch user
      return res.status(HttpStatus.OK).json({ user });
    } catch (error) {
      this.logger.error(
        `Token verification failed: ${error.message}`,
        error.stack,
      ); // Log the error
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Invalid or expired token' });
    }
  }

  /**
   * Refreshes the access token using a refresh token.
   * @param req - HTTP request object containing the refresh token.
   * @param res - HTTP response object.
   */
  @Get('refresh-token')
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    try {
      const refreshToken = req.headers.authorization?.split(' ')[1]; // Extract refresh token
      const newAccessToken =
        await this.authService.refreshAccessToken(refreshToken); // Generate a new access token
      if (!newAccessToken) throw new Error('Invalid or expired refresh token');

      return res.status(HttpStatus.OK).json({ accessToken: newAccessToken });
    } catch (error) {
      this.logger.error(`Refresh token failed: ${error.message}`, error.stack); // Log the error
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Invalid or expired refresh token' });
    }
  }
}
