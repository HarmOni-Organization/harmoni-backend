import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  // TODO: update later in a deferent Environment
  points: 1000000, // TODO: Search for it's optimal details 
  duration: 60, // TODO: Search for it's optimal details 
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
