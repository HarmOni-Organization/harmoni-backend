import {
  Controller,
  Post,
  Get,
  UsePipes,
  ValidationPipe,
  Body,
  Query,
  InternalServerErrorException,
  BadRequestException,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { TmdbService } from '../../common/services/tmdb.service';
import { SearchMovieDto, TreeInputDto } from './dto/search-movie.dto';
import { MovieIdDto } from './dto/movie-id.dto';

@Controller('library/movies')
export class MovieController {
  constructor(
    private readonly tmdbService: TmdbService,
    private readonly aiService: AiService,
  ) {}

  @Post('search')
  @UsePipes(new ValidationPipe({ transform: true }))
  async searchMovies(
    @Query() query: SearchMovieDto,
    @Body() treeInput: TreeInputDto,
  ) {
    let requestedMovieNames: string[] = [];
    let extractedNames: string[] = [];

    try {
      // Ensure query.names is always an array
      const queryNames = Array.isArray(query.names) ? query.names : [];

      // Extract movie/anime names from directory structure using AI
      if (treeInput?.tree) {
        try {
          extractedNames = await this.aiService.extractMovieAnimeNames(
            treeInput.tree,
          );

          if (!Array.isArray(extractedNames) || extractedNames.length === 0) {
            console.warn('AI Extraction returned an empty list.');
          } else {
            requestedMovieNames.push(...extractedNames);
          }
        } catch (error) {
          console.error('AI Extraction Failed:', error);
          throw new InternalServerErrorException(
            'AI extraction encountered an error. Please try again.',
          );
        }
      }

      // Merge AI-extracted names with user-provided names
      requestedMovieNames.push(...queryNames);

      // Remove duplicates
      requestedMovieNames = [...new Set(requestedMovieNames)];

      if (requestedMovieNames.length === 0) {
        throw new BadRequestException('No valid movie names provided.');
      }

      // Fetch metadata from TMDB
      let movies = [];
      let notFoundNames: string[] = [];

      try {
        movies =
          await this.tmdbService.searchMoviesByNames(requestedMovieNames);
      } catch (error) {
        console.error('TMDB API request failed:', error);
        throw new InternalServerErrorException(
          'TMDB service is currently unavailable. Please try again later.',
        );
      }

      // Extract successfully fetched movie names
      const fetchedMovieNames = movies.map((movie) => movie.title);

      // Identify names that were **not found** in TMDB
      notFoundNames = requestedMovieNames.filter(
        (name) => !fetchedMovieNames.includes(name),
      );

      return {
        requestedMovieNames, // Names sent for fetching (merged from AI + user query)
        fetchedMovieNames, // Only names that were successfully fetched
        notFoundNames, // Names that were **not found** in TMDB
        movies, // Full TMDB movie metadata
      };
    } catch (error) {
      console.error('Movie search failed:', error);
      throw new InternalServerErrorException(
        'Movie search failed. Please try again.',
      );
    }
  }

  @Get(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getMovieById(@Param() params: MovieIdDto) {
    try {
      const movie = await this.tmdbService.getMovieById(params.id);

      if (!movie) {
        throw new NotFoundException(`Movie with ID ${params.id} not found`);
      }

      return movie;
    } catch (error) {
      console.error(`Failed to fetch movie with ID ${params.id}:`, error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to fetch movie details. Please try again later.',
      );
    }
  }
}
