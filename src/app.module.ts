import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { MongooseModule } from '@nestjs/mongoose';
// import { validate } from 'dtos/env.dto';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    // Load environment variables from .env file and validate them
    ConfigModule.forRoot({
      isGlobal: true, // Make the config module globally available
      // TODO: Fix the env validation 
      // validate, // Custom validation function
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('DB_URL'), // Get the MongoDB URL from the environment
      }),
    }),
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
