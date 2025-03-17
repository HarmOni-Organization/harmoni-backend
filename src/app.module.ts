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
import { GlobalGateway } from './app.gateway';

@Module({
  imports: [
    // Load environment variables from .env file and validate them
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigModule available globally
    }),

    // Configure MongoDB with Mongoose using environment variables
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('DB_URL'), // Retrieve the MongoDB URL from the environment
        useNewUrlParser: true, // Ensures compatibility with new connection strings
        useUnifiedTopology: true, // Handles reconnection logic internally
      }),
    }),

    UserModule,
    AuthModule,
    SyncModule,
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
      )
      .forRoutes('*'); // Apply to all other routes
  }
}
