/**
 * Main application module that configures and imports all feature modules.
 * This module serves as the root module of the application, setting up:
 * - Environment configuration
 * - Database connection
 * - Feature modules (Auth, User, Movie, etc.)
 */
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { JwtService } from '@nestjs/jwt';
import { AuthMiddleware } from './middlewares/auth.middleware';
import { SyncModule } from './sync/sync.module';
import { CommonModule } from './common/common.module';
import { MovieModule } from './movie/movie.module';
import { AiModule } from './ai/ai.module';
import { GlobalGateway } from './app.gateway';
import { PromptModule } from './prompt/prompt.module';
import { NotesModule } from './notes/notes.module';

@Module({
  imports: [
    /**
     * ConfigModule setup
     * - Loads environment variables from .env file
     * - Makes configuration available globally throughout the application
     */
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigModule available globally
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
        uri: configService.get<string>('DB_URL'), // Retrieve the MongoDB URL from the environment
        useNewUrlParser: true, // Ensures compatibility with new connection strings
        useUnifiedTopology: true, // Handles reconnection logic internally
      }),
    }),

    // Feature Modules
    UserModule, // Handles user management and profiles
    SyncModule, // Manages data synchronization operations
    AuthModule, // Handles authentication and authorization
    CommonModule, // Contains shared utilities and common functionality
    MovieModule, // Manages movie-related operations and data
    AiModule, // Handles AI-powered features and recommendations
    PromptModule, // Manages user prompts (create, read, update, delete)
    SyncModule,
    NotesModule, // Manages user notes with real-time sync capabilities
  ],
  controllers: [AppController],
  providers: [GlobalGateway, AppService, JwtService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/check-username/:username', method: RequestMethod.GET },
        { path: 'auth/check-email/:email', method: RequestMethod.GET },
        { path: 'ai/extract-names', method: RequestMethod.POST },
        { path: 'health', method: RequestMethod.GET },
      )
      .forRoutes('*'); // Apply to all other routes
  }
}
