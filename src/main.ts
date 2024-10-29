import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get the ConfigService instance from the application context
  const configService = app.get<ConfigService>(ConfigService);

  // Fetch the PORT from the .env file using the instance of ConfigService
  const port = configService.get<number>('PORT') || 5050;
  
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
