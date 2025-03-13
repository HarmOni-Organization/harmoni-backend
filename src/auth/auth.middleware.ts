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
  async use(req: any, res: any, next: () => void) {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader)
      throw new UnauthorizedException('Authorization header missing');

    // Get the token part (remove 'Bearer ' prefix)
    const token = authHeader.split(' ')[1];
    try {
      // Verify token and get user data
      const decoded = this.jwtService.verify(token);
      req.user = await this.userService.findOneById(decoded.sub);
      next();
    } catch (error) {
      console.error('Authentication failed:', error.message);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
