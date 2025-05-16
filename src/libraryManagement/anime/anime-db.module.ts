import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const animeDbUrl = configService.get<string>('ANIME_DB_URL');
        console.log(`Connecting to anime database at: ${animeDbUrl}`);
        return {
          uri: animeDbUrl,
          useNewUrlParser: true,
          useUnifiedTopology: true,
        };
      },
      connectionName: 'animeDB', // ✅ move it here
    }),
  ],
  exports: [MongooseModule],
})
export class AnimeDbModule {}
