import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
  });

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips out properties not defined in the DTO
      forbidNonWhitelisted: true, // Throws an error if extra properties are provided
      transform: true, // Automatically transforms query and body payloads into DTO instances
    }),
  );

  // Use the global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Get the ConfigService instance from the application context
  const configService = app.get<ConfigService>(ConfigService);

  // Fetch the PORT from the .env file using the instance of ConfigService
  const port = configService.get<number>('PORT') || 5050;
  
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
