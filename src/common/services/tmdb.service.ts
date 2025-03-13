import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class TmdbService {
  private readonly TMDB_API_URL = 'https://api.themoviedb.org/3';
  private readonly TMDB_API_KEY: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.TMDB_API_KEY = this.configService.get<string>('TMDB_API_KEY');
  }

  async searchMoviesByNames(names: string[]) {
    const movieData = [];

    for (const name of names) {
      try {
        // Step 1: Search for the movie
        const searchUrl = `${this.TMDB_API_URL}/search/movie?api_key=${this.TMDB_API_KEY}&query=${encodeURIComponent(name)}`;
        const searchResponse = await this.httpService
          .get(searchUrl)
          .toPromise();
        const results = searchResponse.data.results;

        if (results.length === 0) {
          continue; // Skip if no movie found
        }

        const movieId = results[0].id;

        // Step 2: Fetch full movie details
        const detailsUrl = `${this.TMDB_API_URL}/movie/${movieId}?api_key=${this.TMDB_API_KEY}&append_to_response=credits,keywords`;
        const detailsResponse = await this.httpService
          .get(detailsUrl)
          .toPromise();
        const movie = detailsResponse.data;
        console.log(movie.credits.cast.slice(0, 1));

        // Extract key details
        // TODO: the cast and the crew should be added to a deferent table and only Ids should be in the movie object
        movieData.push({
          id: movie.id,
          title: movie.title,
          release_date: movie.release_date,
          overview: movie.overview,
          runtime: movie.runtime,
          genres: movie.genres.map((g) => g.name),
          ai_genres: movie.genres.slice(0, 4).map((g) => g.name),
          popularity: movie.popularity,
          poster_url: `https://image.tmdb.org/t/p/original${movie.poster_path}`,
          backdrop_url: `https://image.tmdb.org/t/p/original${movie.backdrop_path}`,
          imdb_rating: movie.vote_average,
          // TODO: should be replaced with Ids only
          cast: movie.credits.cast.slice(0, 10).map((c) => ({
            name: c.name,
            character: c.character,
          })),
          ai_cast: movie.credits.cast.slice(0, 3).map((c) => c.name),
          director: movie.credits.crew
            .filter((crew) => crew.job === 'Director')
            .map((d) => d.name)
            .join(', '),
          // TODO: should be replaced with Ids only
          crew: movie.credits.crew.slice(0, 10).map((c) => ({
            name: c.name,
            job: c.job,
          })),
          keywords: movie.keywords.keywords.map((k) => k.name),
          ai_keywords: movie.keywords.keywords.slice(0, 15).map((k) => k.name),
        });
      } catch (error) {
        console.error(`Failed to fetch details for "${name}":`, error);
      }
    }

    return movieData;
  }
}
