import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { AnimeService } from './anime.service';
import { GetSeriesDto } from './dto/series.dto';
import {
  ApiQuery,
  ApiTags,
  ApiParam,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Library - Anime')
@Controller('library/anime')
export class AnimeController {
  private readonly logger = new Logger(AnimeController.name);

  constructor(private readonly animeService: AnimeService) {}

  @Get('series/:id')
  @ApiOperation({
    summary: 'Get a series by ID with optional detailed anime information',
  })
  @ApiParam({ name: 'id', description: 'Series ID' })
  @ApiQuery({
    name: 'detailed',
    required: false,
    type: Boolean,
    description: 'Whether to include detailed anime information',
  })
  @ApiQuery({
    name: 'include',
    required: false,
    type: String,
    description:
      'Comma-separated list of anime arrays to include (e.g., animeIds,characterIds)',
    example: 'animeIds,characterIds',
  })
  @ApiResponse({ status: 200, description: 'Series successfully retrieved' })
  @ApiResponse({ status: 404, description: 'Series not found' })
  async getSeriesById(@Param('id') id: string, @Query() query: GetSeriesDto) {
    try {
      const series = await this.animeService.getSeriesWithDetails(
        id,
        query.detailed,
        query.include,
      );
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
  @ApiOperation({ summary: 'Get an anime by ID' })
  @ApiParam({ name: 'id', description: 'Anime ID' })
  @ApiResponse({ status: 200, description: 'Anime successfully retrieved' })
  @ApiResponse({ status: 404, description: 'Anime not found' })
  async getAnimeById(@Param('id') id: string) {
    try {
      const anime = await this.animeService.getAnimeById(id);
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
  @ApiOperation({ summary: 'Get multiple anime by IDs' })
  @ApiQuery({ name: 'ids', description: 'Comma-separated list of anime IDs' })
  @ApiResponse({
    status: 200,
    description: 'Anime list successfully retrieved',
  })
  async getAnimeByIds(@Query('ids') ids: string) {
    try {
      if (!ids) {
        return [];
      }

      const idArray = ids.split(',');
      return this.animeService.getAnimeByIds(idArray);
    } catch (error) {
      this.logger.error(`Error fetching multiple anime: ${error.message}`);
      throw error;
    }
  }
}
