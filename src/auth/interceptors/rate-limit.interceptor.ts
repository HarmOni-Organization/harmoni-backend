import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  points: 5, // Allow 5 requests
  duration: 60, // Per 60 seconds
});

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;
    
    try {
      await rateLimiter.consume(ip);
      return next.handle();
    } catch {
      throw new HttpException('Too many requests, please try again later', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
