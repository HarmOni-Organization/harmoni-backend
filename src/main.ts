/**
 * Main entry point of the application.
 * This file bootstraps the NestJS application with all necessary configurations,
 * middleware, and global settings.
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

/**
 * Bootstrap function that initializes the NestJS application
 * Sets up global configurations, middleware, and starts the server
 */
async function bootstrap() {
  // Create the NestJS application instance
  const app = await NestFactory.create(AppModule);

  /**
   * Enable CORS (Cross-Origin Resource Sharing)
   * Allows requests from any origin in development
   * Note: In production, you should restrict this to specific origins
   */
  app.enableCors({
    origin: '*',
  });

  /**
   * Global Interceptors
   * - LoggingInterceptor: Logs all incoming HTTP requests
   * Useful for debugging and monitoring application traffic
   */
  app.useGlobalInterceptors(new LoggingInterceptor());

  /**
   * Global Validation Pipe Configuration
   * - whitelist: Removes properties not defined in DTOs
   * - forbidNonWhitelisted: Throws error for extra properties
   * - transform: Automatically transforms payloads to DTO instances
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /**
   * Global Exception Filter
   * - Handles HTTP exceptions consistently across the application
   * - Provides standardized error responses
   */
  app.useGlobalFilters(new HttpExceptionFilter());

  // Initialize configuration service
  const configService = app.get<ConfigService>(ConfigService);

  /**
   * Server Configuration
   * - Retrieves port from environment variables
   * - Falls back to port 5050 if not specified
   */
  const port = configService.get<number>('PORT') || 5050;

  // Start the server
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

// Bootstrap the application
bootstrap();
