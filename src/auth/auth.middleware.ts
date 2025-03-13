/**
 * Authentication Middleware
 *
 * This middleware handles JWT token validation and user authentication for protected routes.
 * It:
 * - Extracts the JWT token from the Authorization header
 * - Validates the token's signature and expiration
 * - Attaches the authenticated user to the request object
 * - Handles unauthorized access attempts
 *
 * Usage:
 * - Apply this middleware to routes that require authentication
 * - The middleware will automatically validate tokens and attach user data
 * - Unauthorized requests will be rejected with appropriate error messages
 */

import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { AUTH_ERROR_MESSAGES } from './auth.types';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  /**
   * Middleware function that processes each request
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Function to call the next middleware
   * @throws UnauthorizedException if token is missing or invalid
   */
  async use(req: any, res: any, next: () => void): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.TOKEN_MISSING);
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = await this.jwtService.verifyAsync(token);
      req.user = await this.userService.findOneById(decoded.userId);
      next();
    } catch (error) {
      console.error('Authentication failed:', error.message);
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.TOKEN_INVALID);
    }
  }
}
