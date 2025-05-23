import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { AnimeService } from './anime.service';
import { AnimeSearchService } from './anime-search.service';
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

  constructor(
    private readonly animeService: AnimeService,
    private readonly animeSearchService: AnimeSearchService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Search for anime by title with fuzzy matching' })
  @ApiQuery({
    name: 'q',
    description:
      'Search query text (supports partial matching and typo tolerance)',
    required: true,
  })
  @ApiQuery({
    name: 'exact',
    description:
      'When true, returns only the single closest match instead of multiple results',
    required: false,
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns list of anime matching the search query, or a single result if exact=true',
  })
  async searchAnime(@Query('q') q: string, @Query('exact') exact: string) {
    try {
      // Convert 'exact' query parameter string to boolean
      const exactMatch = exact === 'true' || exact === '1';
      return await this.animeSearchService.searchAnime(q || '', exactMatch);
    } catch (error) {
      this.logger.error(
        `Error searching anime with query "${q}": ${error.message}`,
      );
      throw new InternalServerErrorException(
        `Error searching anime: ${error.message}`,
      );
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
}
