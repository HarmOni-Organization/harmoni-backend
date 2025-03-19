/**
 * Main application module that configures and imports all feature modules.
 * This module serves as the root module of the application, setting up:
 * - Environment configuration
 * - Database connection
 * - Feature modules (Auth, User, Movie, etc.)
 */
import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SyncModule } from './sync/sync.module';
import { CommonModule } from './common/common.module';
import { MovieModule } from './movie/movie.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    /**
     * ConfigModule setup
     * - Loads environment variables from .env file
     * - Makes configuration available globally throughout the application
     */
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    /**
     * MongoDB Configuration
     * - Sets up Mongoose connection using environment variables
     * - Configures connection options for optimal performance and reliability
     */
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('DB_URL'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
    }),

    // Feature Modules
    UserModule, // Handles user management and profiles
    SyncModule, // Manages data synchronization operations
    AuthModule, // Handles authentication and authorization
    CommonModule, // Contains shared utilities and common functionality
    MovieModule, // Manages movie-related operations and data
    AiModule, // Handles AI-powered features and recommendations
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
