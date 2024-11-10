import { Injectable, NestInterceptor, ExecutionContext, CallHandler, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';

@Injectable()
export class AuthInterceptor implements NestInterceptor {
  constructor(private readonly jwtService: JwtService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token = client.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      client.disconnect();
      throw new UnauthorizedException('Authorization token is missing');
    }

    try {
      // Verify the token and attach user info to the client's data
      const user = this.jwtService.verify(token);
      client.data.user = user;
    } catch (error) {
      client.disconnect();
      throw new UnauthorizedException('Invalid token');
    }

    return next.handle();
  }
}
