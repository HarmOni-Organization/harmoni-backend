import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      console.error('No token provided!');
      throw new UnauthorizedException('Authorization token is missing');
    }

    try {
      const user = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      req['user'] = user; // Attach user info to request object
      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      throw new UnauthorizedException('Invalid token');
    }
  }

  forSocket(socket: Socket, next: (err?: Error) => void): void {
    const token = socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) {
      console.error('Authorization token is missing');
      return next(new Error('Unauthorized'));
    }

    try {
      const user = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      socket.data.user = user;
      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return next(new Error('Unauthorized'));
    }
  }
}
