import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Interceptor that logs HTTP request details and timing information
 * Provides both standard logging and optional detailed debug logging
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);
  private readonly isDebugEnabled: boolean;

  constructor(isDebugEnabled = false) {
    this.isDebugEnabled = isDebugEnabled;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;

    // Standard request logging
    this.logger.log(`${method} ${url} Enter`);

    // Debug level request details if enabled
    if (this.isDebugEnabled) {
      this.logger.debug('Request Details:', {
        method,
        url,
        headers: request.headers,
        body: request.body,
        timestamp: new Date(now).toISOString(),
      });
    }

    return next.handle().pipe(
      tap((response) => {
        const timeTaken = Date.now() - now;

        // Standard response logging
        this.logger.log(`${method} ${url} Exit t:${timeTaken}ms`);

        // Debug level response details if enabled
        if (this.isDebugEnabled) {
          this.logger.debug('Response Details:', {
            method,
            url,
            responseData: response,
            processingTime: timeTaken,
            timestamp: new Date().toISOString(),
          });
        }
      }),
    );
  }
}
