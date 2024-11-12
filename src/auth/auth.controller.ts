import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from '../dto';
import { Response, Request } from 'express';
import { RateLimitInterceptor } from './interceptors/rate-limit.interceptor';
import { ErrorHandlingInterceptor } from './interceptors/error-handling.interceptor';

@Controller('auth')
@UseInterceptors(RateLimitInterceptor, ErrorHandlingInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login endpoint for authenticating a user and returning a JWT token.
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    try {
      const { user, token } = await this.authService.loginUser(loginDto);
      return res.status(HttpStatus.OK).json({ accessToken: token, user });
    } catch (error) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Login failed. Invalid credentials.',
        details: error.message || 'Authentication error occurred.',
      });
    }
  }

  /**
   * Register endpoint for creating a new user and returning a JWT token.
   */
  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Res() res: Response) {
    try {
      const { user, token } = await this.authService.registerUser(registerDto);
      return res.status(HttpStatus.CREATED).json({ accessToken: token, user });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || 'Registration failed',
        details: error.details || 'An error occurred during registration.',
      });
    }
  }

  /**
   * Logs out the user by invalidating the token.
   */
  @Get('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const token = req.headers.authorization?.split(' ')[1];
    await this.authService.invalidateToken(token);
    return res
      .status(HttpStatus.OK)
      .json({ message: 'Logged out successfully' });
  }

  /**
   * Verifies the validity of a given JWT token.
   */
  @Get('verify-token')
  async verifyToken(@Req() req: Request, @Res() res: Response) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !(await this.authService.isTokenValid(token))) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Invalid or expired token' });
    }
    const { userId, email, firstName, lastName, createdAt } =
      await this.authService.getUserFromToken(token);
    return res.status(HttpStatus.OK).json({
      user: {
        userId,
        email,
        firstName,
        lastName,
        createdAt,
      },
    });
  }

  /**
   * Refreshes the access token using a refresh token.
   */
  @Get('refresh-token')
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.headers.authorization?.split(' ')[1];
    const newAccessToken =
      await this.authService.refreshAccessToken(refreshToken);
    if (!newAccessToken) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Invalid or expired refresh token' });
    }
    return res.status(HttpStatus.OK).json({ accessToken: newAccessToken });
  }
}
