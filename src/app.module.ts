import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    // Load environment variables from .env file and validate them
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigModule available globally
      // TODO: Fix the env validation 
      // validate, // Uncomment if using a validation function for environment variables
    }),

    // Configure MongoDB with Mongoose using environment variables
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('DB_URL'), // Retrieve the MongoDB URL from the environment
        useNewUrlParser: true,  // Ensures compatibility with new connection strings
        useUnifiedTopology: true, // Handles reconnection logic internally
      }),
    }),

    UserModule,
    SyncModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
