import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    this.logger.debug(`Processing request to ${req.originalUrl}`);

    const authHeader = req.headers.authorization;
    this.logger.debug(`Authorization header: ${authHeader}`);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.error('No valid authorization header found');
      throw new UnauthorizedException('Authorization token is missing');
    }

    const token = authHeader.split(' ')[1];
    this.logger.debug('Token extracted from header');

    try {
      const user = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      this.logger.debug(
        `Token verified successfully. User: ${JSON.stringify(user)}`,
      );
      req['user'] = user; // Attach user info to request object
      next();
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  forSocket(socket: Socket, next: (err?: Error) => void): void {
    this.logger.debug('Processing socket connection');

    const token = socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) {
      this.logger.error('Authorization token is missing for socket');
      return next(new Error('Unauthorized'));
    }

    try {
      const user = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      this.logger.debug(`Socket token verified. User: ${JSON.stringify(user)}`);
      socket.data.user = user;
      next();
    } catch (error) {
      this.logger.error(`Socket token verification failed: ${error.message}`);
      return next(new Error('Unauthorized'));
    }
  }
}
