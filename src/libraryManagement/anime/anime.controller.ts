import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  BadRequestException,
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

  @Get('search')
  @ApiOperation({
    summary: 'Search for anime by name with optional season number',
  })
  @ApiQuery({
    name: 'name',
    required: true,
    type: String,
    description:
      'Anime name to search for. Can include season suffix like "S2" or "season 3"',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the most relevant match with detailed information',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Anime ID' },
        seriesId: { type: 'string', description: 'Series ID (if available)' },
        title: { type: 'string', description: 'Anime title' },
        episodes: {
          type: 'number',
          description: 'Number of episodes (if available)',
        },
        format: {
          type: 'string',
          description: 'Anime format (TV, Movie, OVA, etc.)',
        },
      },
      required: ['id', 'title'],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No matches found for the search query',
  })
  async searchAnime(@Query('name') name: string): Promise<{
    id: string;
    seriesId?: string;
    title: string;
    episodes?: number;
    format?: string;
  }> {
    try {
      if (!name || name.trim() === '') {
        throw new BadRequestException('Search query is required');
      }
      return this.animeService.searchAnime(name);
    } catch (error) {
      this.logger.error(
        `Error searching anime with query "${name}": ${error.message}`,
      );
      throw error;
    }
  }

  @Get('series/:id')
  @ApiOperation({
    summary:
      'Get a series by ID with enhanced metadata and series organization',
  })
  @ApiParam({ name: 'id', description: 'Series ID' })
  @ApiResponse({ status: 200, description: 'Series successfully retrieved' })
  @ApiResponse({ status: 404, description: 'Series not found' })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error. May occur with missing date info or multiple main-series candidates',
  })
  async getSeriesById(@Param('id') id: string) {
    try {
      const series = await this.animeService.getSeriesById(id);
      if (!series) {
        throw new NotFoundException(`Series with ID ${id} not found`);
      }
      return series;
    } catch (error) {
      this.logger.error(
        `Error fetching series with ID ${id}: ${error.message}`,
      );
      if (error instanceof NotFoundException) {
        throw error;
      } else if (error instanceof InternalServerErrorException) {
        throw error;
      } else {
        throw new InternalServerErrorException(
          `Error processing series with ID ${id}: ${error.message}`,
        );
      }
    }
  }

  // For backward compatibility - redirects to new implementation
  @Get('series/:id/details')
  @ApiOperation({
    summary:
      'Legacy endpoint - Get a series by ID with optional detailed anime information',
    deprecated: true,
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
  async getSeriesWithDetails(
    @Param('id') id: string,
    @Query() _: GetSeriesDto,
  ) {
    return this.getSeriesById(id);
  }

  @Get('animeId/:id')
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

  @Get('admin/clear-cache')
  @ApiOperation({
    summary: 'Clear the anime service cache (for testing purposes)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache cleared successfully',
  })
  clearCache() {
    this.animeService.clearCache();
    return { message: 'Cache cleared successfully' };
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
}
