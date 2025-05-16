import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AnimeService } from './anime.service';
import { GetAnimeDto } from './dto/anime.dto';

@Controller('library/anime')
export class AnimeController {
  private readonly logger = new Logger(AnimeController.name);

  constructor(private readonly animeService: AnimeService) {}

  @Get('series/:id')
  async getSeriesById(@Param('id') id: string) {
    try {
      const series = await this.animeService.getSeriesMockData(id);
      if (!series) {
        throw new NotFoundException(`Series with ID ${id} not found`);
      }
      return series;
    } catch (error) {
      this.logger.error(
        `Error fetching series with ID ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getAnimeById(@Param('id') id: string) {
    try {
      const anime = await this.animeService.getAnimeMockData(id);
      if (!anime) {
        throw new NotFoundException(`Anime with ID ${id} not found`);
      }
      return anime;
    } catch (error) {
      this.logger.error(`Error fetching anime with ID ${id}: ${error.message}`);
      throw error;
    }
  }

  @Get()
  async getAnimeByIds(@Query('ids') ids: string) {
    try {
      if (!ids) {
        return [];
      }

      const idArray = ids.split(',');
      return this.animeService.getAnimeByIdsMockData(idArray);
    } catch (error) {
      this.logger.error(`Error fetching multiple anime: ${error.message}`);
      throw error;
    }
  }
}
