import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IAnime } from '../../schemas/animeDB/anime.schema';
import { ISeries } from '../../schemas/animeDB/series.schema';

@Injectable()
export class AnimeService {
  private readonly logger = new Logger(AnimeService.name);
  // In-memory simple cache with TTL
  // TODO: Implement Redis cache
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly CACHE_TTL = 600 * 1000; // 10 minutes in milliseconds

  constructor(
    @InjectModel('Anime', 'animeDB') private animeModel: Model<IAnime>,
    @InjectModel('Series', 'animeDB') private seriesModel: Model<ISeries>,
  ) {}

  /**
   * Get anime data by ID
   * @param id The anime ID
   * @returns Anime data
   */
  async getAnimeById(id: string): Promise<IAnime> {
    this.logger.log(`Getting anime data for ID: ${id}`);
    const anime = await this.animeModel.findOne({ id: id }).exec();
    if (!anime) {
      throw new NotFoundException(`Anime with ID ${id} not found`);
    }
    return anime;
  }

  /**
   * Get multiple anime by their IDs
   * @param ids Array of anime IDs
   * @returns Array of anime data
   */
  async getAnimeByIds(ids: string[]): Promise<IAnime[]> {
    this.logger.log(`Getting anime data for IDs: ${ids.join(', ')}`);
    const anime = await this.animeModel.find({ id: { $in: ids } }).exec();
    return anime;
  }

  /**
   * Get series data by ID with optional detailed anime information
   * @param id The series ID
   * @param detailed Whether to include detailed anime information
   * @param include Optional array of ID arrays to include (e.g., ['animeIds', 'characterIds'])
   * @returns Series data with optional anime details
   */
  async getSeriesWithDetails(
    id: string,
    detailed: boolean = false,
    include?: string[],
  ): Promise<any> {
    this.logger.log(
      `Getting series data for ID: ${id} with detailed=${detailed}`,
    );

    // Create cache key including the include filter if present
    const includeKey = include ? include.sort().join(',') : 'all';
    const cacheKey = `series:${id}:${detailed}:${includeKey}`;
    const cachedItem = this.getFromCache(cacheKey);

    if (cachedItem) {
      this.logger.log(`Retrieved series ${id} from cache`);
      return cachedItem;
    }

    // Fetch series by ID
    const series = await this.seriesModel.findOne({ seriesId: id }).exec();

    if (!series) {
      throw new NotFoundException(`Series with ID ${id} not found`);
    }

    // If detailed is false, return just the series
    if (!detailed) {
      // Cache and return the result
      const result = series.toObject ? series.toObject() : series;
      this.setInCache(cacheKey, result);
      return result;
    }

    // If detailed is true, fetch anime data and organize it
    try {
      // Create animeInfo object with the same structure as series object for ID arrays
      const animeInfo = {
        animeIds: [],
        adaptationIds: [],
        characterIds: [],
        otherIds: [],
        spinOffIds: [],
      };

      // Get the list of arrays to process based on include filter or all available
      const arraysToProcess =
        include && include.length > 0
          ? Object.keys(animeInfo).filter((key) => include.includes(key))
          : Object.keys(animeInfo);

      // Process each filtered array of IDs to fetch their anime data
      await Promise.all(
        arraysToProcess.map((arrayName) =>
          this.populateAnimeArray(arrayName, series[arrayName], animeInfo),
        ),
      );

      // Remove empty arrays from result
      Object.keys(animeInfo).forEach((key) => {
        if (!arraysToProcess.includes(key)) {
          delete animeInfo[key];
        }
      });

      // Create the result object
      const result = {
        ...(series.toObject ? series.toObject() : series),
        animeInfo,
      };

      // Cache the result for future requests
      this.setInCache(cacheKey, result);

      return result;
    } catch (error) {
      this.logger.error(
        `Error fetching detailed series data: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Helper method to populate an array in animeInfo with anime data
   * @param arrayName The name of the array to populate
   * @param ids The array of IDs to fetch
   * @param animeInfo The animeInfo object to update
   */
  private async populateAnimeArray(
    arrayName: string,
    ids: string[] = [],
    animeInfo: any,
  ): Promise<void> {
    if (!ids || ids.length === 0) {
      return;
    }

    try {
      // Process in batches to avoid overwhelming the database
      const BATCH_SIZE = 20;
      const batches = this.createBatches(ids, BATCH_SIZE);
      const results = [];

      for (const batch of batches) {
        const batchResults = await this.animeModel
          .find({ id: { $in: batch } })
          .exec();
        results.push(...batchResults);
      }

      animeInfo[arrayName] = results;
    } catch (error) {
      this.logger.error(
        `Error fetching anime for ${arrayName}: ${error.message}`,
      );
      // Don't throw here, as we want to continue with other arrays even if one fails
    }
  }

  /**
   * Helper method to break array into batches for efficient processing
   * @param array Array to split into batches
   * @param batchSize Size of each batch
   * @returns Array of batches
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get item from cache if it exists and is not expired
   * @param key Cache key
   * @returns Cached data or undefined if not found/expired
   */
  private getFromCache(key: string): any {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (item.expiry < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    return item.data;
  }

  /**
   * Store item in cache with expiration
   * @param key Cache key
   * @param data Data to cache
   */
  private setInCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.CACHE_TTL,
    });
  }
}
