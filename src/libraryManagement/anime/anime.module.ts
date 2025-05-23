import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnimeController } from './anime.controller';
import { AnimeService } from './anime.service';
import { AnimeSearchService } from './anime-search.service';
import { AnimeSchema } from '../../schemas/animeDB/anime.schema';
import { SeriesSchema } from '../../schemas/animeDB/series.schema';
import { AnimeDbModule } from './anime-db.module';

@Module({
  imports: [
    AnimeDbModule,
    MongooseModule.forFeature(
      [
        { name: 'Anime', schema: AnimeSchema },
        { name: 'Series', schema: SeriesSchema },
      ],
      'animeDB',
    ),
  ],
  controllers: [AnimeController],
  providers: [AnimeService, AnimeSearchService],
  exports: [AnimeService, AnimeSearchService],
})
export class AnimeModule {}
