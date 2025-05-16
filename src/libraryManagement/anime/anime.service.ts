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
   * Search for anime by name with optional season number handling
   * @param userInput User's search query, which may include a season suffix
   * @returns Detailed information about the most relevant match
   */
  async searchAnime(userInput: string): Promise<{
    id: string;
    seriesId?: string;
    title: string;
    episodes?: number;
    format?: string;
  }> {
    this.logger.log(`Searching anime with query: ${userInput}`);

    // Check cache first
    const cacheKey = `search:${userInput}`;
    const cachedResult = this.getFromCache(cacheKey);
    if (cachedResult) {
      this.logger.log(`Retrieved search results for "${userInput}" from cache`);
      return cachedResult;
    }

    // Process input
    const { normInput, seasonNumber } = this.processSearchInput(userInput);
    this.logger.log(
      `Processed input: normInput="${normInput}", seasonNumber=${seasonNumber}`,
    );

    // Generate fuzzy search regex
    const fuzzyRegex = new RegExp(normInput.split(' ').join('.*'), 'i');
    console.log(fuzzyRegex, '-------------------------------');

    try {
      // Search for candidates using aggregation
      const candidates = await this.animeModel.aggregate([
        // Normalize titles for matching
        {
          $addFields: {
            normalizedTitles: {
              $concatArrays: [
                {
                  $ifNull: [
                    {
                      $map: {
                        input: { $objectToArray: '$title' },
                        as: 'title',
                        in: {
                          $toLower: {
                            $trim: {
                              input: { $ifNull: ['$$title.v', ''] },
                            },
                          },
                        },
                      },
                    },
                    [],
                  ],
                },
                {
                  $ifNull: [
                    {
                      $map: {
                        input: { $ifNull: ['$synonyms', []] },
                        as: 'syn',
                        in: {
                          $toLower: {
                            $trim: { input: { $ifNull: ['$$syn', ''] } },
                          },
                        },
                      },
                    },
                    [],
                  ],
                },
              ],
            },
          },
        },
        // Match against normalized titles
        {
          $match: {
            normalizedTitles: { $elemMatch: { $regex: fuzzyRegex } },
          },
        },
        // Project all fields we need in the response
        {
          $project: {
            _id: 1,
            id: 1,
            title: 1,
            seriesId: 1,
            episodes: 1,
            format: 1,
          },
        },
        // Get more candidates to allow for better ranking
        { $limit: 50 },
      ]);

      this.logger.log(
        `Found ${candidates.length} potential matches for "${normInput}"`,
      );

      if (candidates.length === 0) {
        // If no matches found, return simple 404-like response
        throw new NotFoundException('No matches found for the search query');
      }

      // Score and rank the candidates based on relevance to user input
      const scoredCandidates = candidates.map((anime) => {
        let score = 0;
        const titles = [];

        // Get all possible titles for matching
        if (anime.title) {
          if (anime.title.userPreferred)
            titles.push({ text: anime.title.userPreferred, weight: 5 });
          if (anime.title.english)
            titles.push({ text: anime.title.english, weight: 4 });
          if (anime.title.romaji)
            titles.push({ text: anime.title.romaji, weight: 3 });
        }

        // Include synonyms if available
        if (anime.synonyms && Array.isArray(anime.synonyms)) {
          anime.synonyms.forEach((syn) =>
            titles.push({ text: syn, weight: 2 }),
          );
        }

        // Calculate scores for each title
        titles.forEach(({ text, weight }) => {
          const lcText = text.toLowerCase();
          const lcInput = normInput.toLowerCase();

          // Exact match is the best
          if (lcText === lcInput) {
            score += 100 * weight;
          }
          // Starts with is very good
          else if (lcText.startsWith(lcInput)) {
            score += 50 * weight;
          }
          // Contains as whole word is good
          else if (lcText.includes(` ${lcInput} `)) {
            score += 30 * weight;
          }
          // Contains is okay
          else if (lcText.includes(lcInput)) {
            score += 20 * weight;
          }

          // Season detection in titles is weighted heavily
          if (seasonNumber !== null) {
            // Direct season match in title
            if (
              (seasonNumber === 2 &&
                /\bii\b|\b2\b|\bsecond season\b|\bseason 2\b/i.test(lcText)) ||
              (seasonNumber === 3 &&
                /\biii\b|\b3\b|\bthird season\b|\bseason 3\b/i.test(lcText)) ||
              (seasonNumber === 4 &&
                /\biv\b|\b4\b|\bfourth season\b|\bseason 4\b/i.test(lcText))
            ) {
              score += 1000; // Very high score for direct season match
            }
          }
        });

        return { ...anime, score };
      });

      // Sort candidates by score (descending)
      scoredCandidates.sort((a, b) => b.score - a.score);

      // Log the top candidates with their scores
      scoredCandidates.slice(0, 5).forEach((anime, index) => {
        const title = this.getPreferredTitle(anime.title);
        this.logger.log(
          `Ranked #${index + 1}: [Score: ${anime.score}] ID=${anime.id}, Title=${title}`,
        );
      });

      // If we have a season number, we need to handle that logic
      if (seasonNumber !== null && scoredCandidates.length > 0) {
        this.logger.log(
          `Searching for season ${seasonNumber} of "${this.getPreferredTitle(scoredCandidates[0].title)}"`,
        );

        // First check if one of our top candidates already matches the season number in its title
        for (let i = 0; i < Math.min(scoredCandidates.length, 5); i++) {
          const anime = scoredCandidates[i];
          const title = this.getPreferredTitle(anime.title);

          // Check for direct season indicators in the title
          if (
            (seasonNumber === 2 &&
              /\bii\b|\b2\b|\bsecond season\b|\bseason 2\b/i.test(title)) ||
            (seasonNumber === 3 &&
              /\biii\b|\b3\b|\bthird season\b|\bseason 3\b/i.test(title)) ||
            (seasonNumber === 4 &&
              /\biv\b|\b4\b|\bfourth season\b|\bseason 4\b/i.test(title))
          ) {
            this.logger.log(
              `Found direct season match in title: ${anime.id} (${title})`,
            );

            const result = {
              id: anime.id,
              seriesId: anime.seriesId,
              title: this.getPreferredTitle(anime.title),
              episodes: anime.episodes,
              format: anime.format,
            };

            this.setInCache(cacheKey, result);
            return result;
          }
        }

        // If no direct match found, try the sequel chain method
        const resultId = await this.findAnimeBySeason(
          scoredCandidates[0],
          seasonNumber,
        );

        if (resultId && 'id' in resultId) {
          this.logger.log(`Found exact season match: ${resultId.id}`);

          // Fetch the complete anime data for this ID
          const animeData = await this.animeModel
            .findOne({ id: resultId.id })
            .exec();
          if (animeData) {
            const result = {
              id: animeData.id,
              title: this.getPreferredTitle(animeData.get('title')),
              episodes: animeData.get('episodes'),
              format: animeData.get('format'),
              seriesId: animeData.get('seriesId'),
            };

            this.setInCache(cacheKey, result);
            return result;
          }

          // Fallback to just the ID and a generic title if anime not found
          return {
            id: resultId.id,
            title: `Anime ${resultId.id}`,
          };
        } else if (
          resultId &&
          'suggestions' in resultId &&
          resultId.suggestions.length > 0
        ) {
          // If we get suggestions from season handling, return the first one
          const suggestion = resultId.suggestions[0];
          this.logger.log(
            `Using first suggestion from multiple season options: ${suggestion.id}`,
          );

          // Fetch the complete anime data for this ID
          const animeData = await this.animeModel
            .findOne({ id: suggestion.id })
            .exec();
          if (animeData) {
            const result = {
              id: animeData.id,
              title: this.getPreferredTitle(animeData.get('title')),
              episodes: animeData.get('episodes'),
              format: animeData.get('format'),
              seriesId: animeData.get('seriesId'),
            };

            this.setInCache(cacheKey, result);
            return result;
          }

          // If we can't find the anime data, return just the suggestion with title we have
          return {
            id: suggestion.id,
            title: suggestion.title,
          };
        } else {
          this.logger.log(
            `No season match found via relations, trying title-based detection...`,
          );

          // Try title-based detection on all candidates
          for (const anime of scoredCandidates) {
            const title = this.getPreferredTitle(anime.title);
            const lcTitle = title.toLowerCase();

            // Check if the title appears to be a sequel by pattern matching
            if (
              (seasonNumber === 2 &&
                /\bii\b|\b2\b|\bsecond season\b|\bseason 2\b/i.test(lcTitle)) ||
              (seasonNumber === 3 &&
                /\biii\b|\b3\b|\bthird season\b|\bseason 3\b/i.test(lcTitle)) ||
              (seasonNumber === 4 &&
                /\biv\b|\b4\b|\bfourth season\b|\bseason 4\b/i.test(lcTitle))
            ) {
              this.logger.log(
                `Found title-based season match: ${anime.id} (${title})`,
              );

              const result = {
                id: anime.id,
                seriesId: anime.seriesId,
                title: title,
                episodes: anime.episodes,
                format: anime.format,
              };

              this.setInCache(cacheKey, result);
              return result;
            }
          }

          this.logger.log(
            `No season match found, falling back to best match: ${scoredCandidates[0].id}`,
          );
        }
      }

      // Return the highest ranked (closest) match with additional info
      const bestMatch = scoredCandidates[0];
      const result = {
        id: bestMatch.id,
        seriesId: bestMatch.seriesId,
        title: this.getPreferredTitle(bestMatch.title),
        episodes: bestMatch.episodes,
        format: bestMatch.format,
      };

      this.logger.log(`Returning best match: ${result.id} (${result.title})`);
      this.setInCache(cacheKey, result);
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error searching anime: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Process user search input to extract season number and normalize text
   * @param userInput Raw user search input
   * @returns Normalized input and optional season number
   */
  private processSearchInput(userInput: string): {
    normInput: string;
    seasonNumber: number | null;
  } {
    // Extract season number if present
    const seasonMatch = userInput.match(/(?:\/?|\s+)(?:S|season)\s*(\d+)$/i);
    const seasonNumber = seasonMatch ? +seasonMatch[1] : null;
    const baseInput = seasonMatch
      ? userInput.slice(0, seasonMatch.index).trim()
      : userInput;

    // Normalize the base input for search
    const normInput = baseInput
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();

    return { normInput, seasonNumber };
  }

  /**
   * Find anime by season number when a season suffix is provided
   * @param animeDoc The base anime document found in search
   * @param seasonNumber The season number to find
   * @returns Either a single anime ID or suggestions for multiple options
   */
  private async findAnimeBySeason(
    animeDoc: any,
    seasonNumber: number,
  ): Promise<
    | { id: string }
    | { suggestions: Array<{ id: string; title: string }> }
    | null
  > {
    try {
      // If we're looking for season 1, just return the original anime
      if (seasonNumber === 1) {
        this.logger.log(
          `Season ${seasonNumber} requested, returning original anime: ${animeDoc.id}`,
        );
        return { id: animeDoc.id };
      }

      // If no series ID, we can't find sequels
      if (!animeDoc.seriesId) {
        this.logger.log(
          `No seriesId found for anime ${animeDoc.id}, can't traverse sequel chain`,
        );
        return { id: animeDoc.id };
      }

      this.logger.log(
        `Finding season ${seasonNumber} for anime ${animeDoc.id} in series ${animeDoc.seriesId}`,
      );

      // Get the series with related anime
      const series = await this.getSeriesWithDetails(animeDoc.seriesId, true, [
        'animeIds',
      ]);

      if (!series || !series.animeInfo || !series.animeInfo.animeIds) {
        this.logger.log(
          `No series or animeInfo found for seriesId ${animeDoc.seriesId}`,
        );
        return { id: animeDoc.id };
      }

      // Build a sequence map using the relationType field if available
      const animeById = new Map();
      const sequelMap = new Map();
      const prequelMap = new Map();

      // Log the number of animes in the series
      this.logger.log(
        `Series ${animeDoc.seriesId} has ${series.animeInfo.animeIds.length} anime entries`,
      );

      // Collect anime by ID and organize relations
      for (const anime of series.animeInfo.animeIds) {
        animeById.set(anime.id, anime);

        // Debug titles to help identify anime
        const title = this.getPreferredTitle(anime.title);
        this.logger.log(`Processing anime: ${anime.id} (${title})`);

        // Look for relation information
        if (anime.relations && Array.isArray(anime.relations)) {
          for (const relation of anime.relations) {
            if (relation.type === 'SEQUEL') {
              if (!sequelMap.has(anime.id)) {
                sequelMap.set(anime.id, []);
              }
              sequelMap.get(anime.id).push(relation.id);
              this.logger.log(
                `Found SEQUEL relation: ${anime.id} → ${relation.id}`,
              );

              // Also set prequel relation
              prequelMap.set(relation.id, anime.id);
            }
          }
        } else {
          this.logger.log(`No relations found for anime ${anime.id}`);

          // Fall back to title-based detection
          if (
            title.match(/\bII\b|\b2\b|\bSecond Season\b|\bSeason 2\b/i) &&
            seasonNumber === 2
          ) {
            this.logger.log(
              `Found season 2 by title pattern: ${anime.id} (${title})`,
            );
            return { id: anime.id };
          } else if (
            title.match(/\bIII\b|\b3\b|\bThird Season\b|\bSeason 3\b/i) &&
            seasonNumber === 3
          ) {
            this.logger.log(
              `Found season 3 by title pattern: ${anime.id} (${title})`,
            );
            return { id: anime.id };
          } else if (
            title.match(/\bIV\b|\b4\b|\bFourth Season\b|\bSeason 4\b/i) &&
            seasonNumber === 4
          ) {
            this.logger.log(
              `Found season 4 by title pattern: ${anime.id} (${title})`,
            );
            return { id: anime.id };
          }
        }
      }

      // Check if we found any sequel relations
      this.logger.log(`Found ${sequelMap.size} anime with SEQUEL relations`);

      // Try to find matching title with season number
      const baseTitle = this.getPreferredTitle(animeDoc.title)
        .replace(
          /\s+(?:season|s)\s*\d+|\s+\d+(?:nd|rd|th)\s+season|\s+(?:II|III|IV)$/i,
          '',
        )
        .trim();
      this.logger.log(
        `Looking for anime with base title pattern: ${baseTitle} and season ${seasonNumber}`,
      );

      for (const anime of series.animeInfo.animeIds) {
        const title = this.getPreferredTitle(anime.title);

        // Check for season in title
        if (
          title.match(
            new RegExp(
              `${baseTitle}\\s+(?:season|s)\\s*${seasonNumber}|${baseTitle}\\s+${seasonNumber}(?:nd|rd|th)\\s+season`,
              'i',
            ),
          )
        ) {
          this.logger.log(
            `Found anime with season ${seasonNumber} in title: ${anime.id} (${title})`,
          );
          return { id: anime.id };
        }

        // Check for roman numerals
        const romanNumerals = [
          'I',
          'II',
          'III',
          'IV',
          'V',
          'VI',
          'VII',
          'VIII',
          'IX',
          'X',
        ];
        if (
          seasonNumber <= romanNumerals.length &&
          title.match(
            new RegExp(
              `${baseTitle}\\s+${romanNumerals[seasonNumber - 1]}$`,
              'i',
            ),
          )
        ) {
          this.logger.log(
            `Found anime with roman numeral ${romanNumerals[seasonNumber - 1]}: ${anime.id} (${title})`,
          );
          return { id: anime.id };
        }

        // Check for sequel in title
        if (
          seasonNumber === 2 &&
          title.match(/sequel|second season|season 2|part 2|s2/i)
        ) {
          this.logger.log(
            `Found anime with sequel indicators: ${anime.id} (${title})`,
          );
          return { id: anime.id };
        }
      }

      // If no title matches, try to find the root anime (with no prequels)
      let rootAnime = animeDoc.id;
      while (prequelMap.has(rootAnime)) {
        rootAnime = prequelMap.get(rootAnime);
        this.logger.log(`Tracing prequel chain: found root ${rootAnime}`);
      }

      this.logger.log(`Starting from root anime: ${rootAnime}`);

      // Now traverse from root to find the requested season
      let current = rootAnime;
      let currentSeason = 1;

      while (currentSeason < seasonNumber) {
        const sequels = sequelMap.get(current) || [];
        if (sequels.length === 0) {
          this.logger.log(
            `No more sequels found for ${current}, reached season ${currentSeason}`,
          );
          return null; // Season not found
        }

        if (sequels.length > 1) {
          this.logger.log(
            `Found ${sequels.length} sequel branches from ${current}`,
          );
          // Multiple branches, return suggestions
          return {
            suggestions: sequels.map((id) => ({
              id,
              title: this.getPreferredTitle(animeById.get(id)?.title),
            })),
          };
        }

        current = sequels[0];
        currentSeason++;
        this.logger.log(
          `Following sequel chain: ${current} (season ${currentSeason})`,
        );
      }

      this.logger.log(`Found season ${seasonNumber}: ${current}`);
      return { id: current };
    } catch (error) {
      this.logger.error(
        `Error finding anime by season: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Helper to get the preferred title from anime title object
   * @param title Anime title object with multiple variants
   * @returns Best available title string
   */
  private getPreferredTitle(title: any): string {
    if (!title) return 'Unknown';
    return title.userPreferred || title.english || title.romaji || 'Unknown';
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

  /**
   * Clear the cache for testing purposes
   * This should be used via an admin-only endpoint
   */
  clearCache(): void {
    this.logger.log('Clearing the anime service cache');
    this.cache.clear();
  }
}
