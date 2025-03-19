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
import * as bodyParser from 'body-parser';

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
    origin: '*', // Adjust as needed
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Ensure all methods are allowed
  });

  app.use(bodyParser.json()); // Ensure JSON body is parsed
  app.use(bodyParser.urlencoded({ extended: true }));

  // Log all incoming requests
  app.use((req, res, next) => {
    console.log(`Received request: ${req.method} ${req.url}`);
    next();
  });

  /**
   * Global Interceptors
   * - LoggingInterceptor: Logs all incoming HTTP requests
   * Useful for debugging and monitoring application traffic
   */
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Force Express to recognize request methods correctly
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.headers['x-original-method']) {
      req.method = req.headers['x-original-method'];
    }
    next();
  });

  /**
   * Global Validation Pipe Configuration
   * - whitelist: Removes properties not defined in DTOs
   * - forbidNonWhitelisted: Throws error for extra properties
   * - transform: Automatically transforms payloads to DTO instances
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips out properties not defined in the DTO
      forbidNonWhitelisted: true, // Throws an error if extra properties are provided
      transform: true, // Automatically transforms query and body payloads into DTO instances
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
bootstrap();
