import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IAnime } from '../../schemas/animeDB/anime.schema';
import { ISeries } from '../../schemas/animeDB/series.schema';

@Injectable()
export class AnimeSearchService {
  private readonly logger = new Logger(AnimeSearchService.name);

  // Noise words to filter out from search queries
  private readonly NOISE_WORDS = [
    'anime',
    'series',
    'show',
    'movie',
    'tv',
    'drama',
  ];

  constructor(
    @InjectModel('Anime', 'animeDB') private animeModel: Model<IAnime>,
    @InjectModel('Series', 'animeDB') private seriesModel: Model<ISeries>,
  ) {}

  /**
   * Search for anime based on normalized query text
   * @param queryText Search query from user
   * @param exactMatch If true, returns only the single closest match
   * @returns List of matching anime with their series IDs, or single closest match
   */
  async searchAnime(queryText: string, exactMatch: boolean = false) {
    this.logger.log(
      `Searching anime with query: ${queryText} (exactMatch: ${exactMatch})`,
    );

    // Direct matching for multi-word queries to avoid issues with partial matches
    if (queryText.trim().includes(' ') || queryText.includes('/')) {
      const directMatches = await this.findDirectMatches(queryText);
      if (directMatches.length > 0) {
        this.logger.log(
          `Found ${directMatches.length} direct matches for "${queryText}"`,
        );
        return exactMatch ? directMatches[0] : directMatches;
      }
    }

    // Normal search for other queries
    const query = this.normalizeQuery(queryText);

    if (!query) {
      return exactMatch ? null : [];
    }

    // Try Atlas Search first, fall back to standard MongoDB search if it fails
    try {
      return await this.atlasSearch(query, exactMatch);
    } catch (error) {
      this.logger.warn(
        `Atlas Search failed, falling back to standard search: ${error.message}`,
      );
      return this.standardSearch(query, exactMatch);
    }
  }

  /**
   * Find direct matches for a query by looking for the exact string in titles
   * @param queryText The query text
   * @returns Array of matches with exact title matches first
   */
  private async findDirectMatches(queryText: string): Promise<any[]> {
    const cleanQuery = queryText.toLowerCase().trim();
    const queryRegex = this.createQueryRegexes(cleanQuery);

    // First, try to find exact phrase matches
    const directResults = await this.animeModel
      .find({
        $or: [
          {
            'title.english': {
              $regex: queryRegex.exactPhraseRegex,
              $options: 'i',
            },
          },
          {
            'title.romaji': {
              $regex: queryRegex.exactPhraseRegex,
              $options: 'i',
            },
          },
          {
            'title.userPreferred': {
              $regex: queryRegex.exactPhraseRegex,
              $options: 'i',
            },
          },
          { synonyms: { $regex: queryRegex.exactPhraseRegex, $options: 'i' } },
        ],
      })
      .limit(10)
      .select('id title synonyms -_id')
      .lean();

    if (directResults.length > 0) {
      // Post-process to ensure exact matches are on top
      return this.sortByExactMatch(directResults, cleanQuery);
    }

    // If no direct matches, try to find titles containing all words in the query
    const queryWords = cleanQuery.split(/[\s\/]+/);
    if (queryWords.length > 1) {
      const wordMatches = await this.animeModel
        .find({
          $and: queryWords.map((word) => ({
            $or: [
              { 'title.english': { $regex: word, $options: 'i' } },
              { 'title.romaji': { $regex: word, $options: 'i' } },
              { 'title.userPreferred': { $regex: word, $options: 'i' } },
              { synonyms: { $regex: word, $options: 'i' } },
            ],
          })),
        })
        .limit(10)
        .select('id title synonyms -_id')
        .lean();

      if (wordMatches.length > 0) {
        return this.sortByExactMatch(wordMatches, cleanQuery);
      }
    }

    return [];
  }

  /**
   * Create regex patterns for matching a query in various formats
   * @param query The query string
   * @returns Object with various regex patterns
   */
  private createQueryRegexes(query: string) {
    // Create various regex patterns to match the query in different forms

    // Escape special regex characters in the query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // For exact phrase matching (word boundaries)
    const exactPhraseRegex = `\\b${escapedQuery}\\b`;

    // For matching different word separators (space, slash, etc.)
    const flexibleSeparators = escapedQuery
      .replace(/\s+/g, '[\\s\\/]+') // Replace spaces with flexible space or slash
      .replace(/\//g, '[\\s\\/]+'); // Replace slashes with flexible space or slash

    // Additional regexes can be added here for more variations

    return {
      exactPhraseRegex,
      flexibleSeparators,
    };
  }

  /**
   * Sort results to prioritize exact matches
   * @param results Search results
   * @param query Query text
   * @returns Sorted results with exact matches first
   */
  private async sortByExactMatch(
    results: any[],
    query: string,
  ): Promise<any[]> {
    // Make a copy we can modify
    const processedResults = [...results];

    // Score each result for exact title match
    processedResults.forEach((result) => {
      let score = 0;
      let matchFound = false;
      let matchType = '';

      // Check each title field
      for (const field of ['english', 'romaji', 'native', 'userPreferred']) {
        if (result.title && result.title[field]) {
          const title = result.title[field].toLowerCase();

          // Exact match gets highest score
          if (title === query) {
            score = 1000;
            matchType = `exact-${field}`;
            matchFound = true;
            break;
          }

          // Contains the full query as a substring (case insensitive)
          if (title.includes(query)) {
            // If the query is a significant portion of the title
            const portion = query.length / title.length;
            const containsScore = 800 + portion * 100;

            if (containsScore > score) {
              score = containsScore;
              matchType = `contains-${field}`;
              matchFound = true;
            }
          }

          // Contains the query with different separators (space vs slash)
          const altQuerySpaces = query.replace(/\//g, ' ');
          const altQuerySlashes = query.replace(/\s+/g, '/');

          if (
            title.includes(altQuerySpaces) ||
            title.includes(altQuerySlashes)
          ) {
            const altScore = 750;
            if (altScore > score) {
              score = altScore;
              matchType = `alt-format-${field}`;
              matchFound = true;
            }
          }
        }
      }

      // Check synonyms
      if (result.synonyms && Array.isArray(result.synonyms)) {
        for (const synonym of result.synonyms) {
          if (typeof synonym !== 'string') continue;

          const synonymLower = synonym.toLowerCase();

          // Exact match with synonym
          if (synonymLower === query) {
            const synScore = 700;
            if (synScore > score) {
              score = synScore;
              matchType = 'exact-synonym';
              matchFound = true;
            }
          }

          // Contains the query as a substring
          if (synonymLower.includes(query)) {
            const portion = query.length / synonymLower.length;
            const synContainsScore = 600 + portion * 50;

            if (synContainsScore > score) {
              score = synContainsScore;
              matchType = 'contains-synonym';
              matchFound = true;
            }
          }
        }
      }

      // Set the score on the result
      result._score = score;
      result._matchType = matchType;
      result._matchFound = matchFound;
    });

    // Sort results by score descending
    processedResults.sort((a, b) => b._score - a._score);

    // Get only results with a match
    const matchedResults = processedResults.filter((r) => r._matchFound);

    // Add series IDs to the results
    return await this.addSeriesIds(
      matchedResults.length > 0 ? matchedResults : processedResults,
    );
  }

  /**
   * Perform search using MongoDB Atlas Search (requires MongoDB Atlas)
   * @param query Normalized search query
   * @param exactMatch If true, returns only the single closest match
   * @returns Search results with series IDs
   */
  private async atlasSearch(query: string, exactMatch: boolean = false) {
    // First, search for matching anime using Atlas Search
    const searchResults = await this.animeModel.aggregate([
      {
        $search: {
          index: 'anime_title_search',
          autocomplete: {
            query,
            path: [
              'title.english',
              'title.romaji',
              'title.native',
              'title.userPreferred',
              'synonyms',
            ],
            fuzzy: {
              maxEdits: 2,
              prefixLength: 1,
            },
          },
        },
      },
      { $limit: exactMatch ? 5 : 10 }, // Fetch fewer results if exactMatch is true
      {
        $project: {
          _id: 0,
          id: 1,
          title: 1,
        },
      },
    ]);

    const results = await this.addSeriesIds(searchResults);

    // If exactMatch is true, return only the single best match
    return exactMatch ? (results.length > 0 ? results[0] : null) : results;
  }

  /**
   * Perform search using standard MongoDB (without requiring Atlas Search)
   * @param query Normalized search query
   * @param exactMatch If true, returns only the single closest match
   * @returns Search results with series IDs
   */
  private async standardSearch(query: string, exactMatch: boolean = false) {
    // First try the direct matching approach for multi-word queries
    if (query.includes(' ') || query.includes('/')) {
      const directMatches = await this.findDirectMatches(query);
      if (directMatches.length > 0) {
        this.logger.log(
          `Found ${directMatches.length} direct matches in standardSearch`,
        );
        return exactMatch ? directMatches[0] : directMatches;
      }
    }

    // Create regex patterns for case-insensitive partial matching
    const regexPattern = new RegExp(query, 'i');

    // Create a version of the query with flexible spacing
    // This will match both "overlordii" and "overlord ii"
    const noSpaceQuery = query.replace(/\s+/g, '');
    const flexibleSpacePattern = new RegExp(
      noSpaceQuery.split('').join('\\s*'),
      'i',
    );

    // Tokenize the query into words for partial word matching
    const queryWords = query.split(/\s+/).filter((word) => word.length >= 2);

    // Search across various title fields and synonyms
    const searchResults = await this.animeModel
      .find({
        $or: [
          { 'title.english': { $in: [regexPattern, flexibleSpacePattern] } },
          { 'title.romaji': { $in: [regexPattern, flexibleSpacePattern] } },
          { 'title.native': { $in: [regexPattern, flexibleSpacePattern] } },
          {
            'title.userPreferred': {
              $in: [regexPattern, flexibleSpacePattern],
            },
          },
          { synonyms: { $in: [regexPattern, flexibleSpacePattern] } },
          // Add word-based searches for when each individual word appears
          ...queryWords.map((word) => ({
            'title.english': new RegExp(word, 'i'),
          })),
          ...queryWords.map((word) => ({
            'title.romaji': new RegExp(word, 'i'),
          })),
          ...queryWords.map((word) => ({
            'title.userPreferred': new RegExp(word, 'i'),
          })),
          ...queryWords.map((word) => ({ synonyms: new RegExp(word, 'i') })),
        ],
      })
      .limit(exactMatch ? 15 : 30)
      .select('id title synonyms -_id')
      .lean();

    // Sort and score the results
    const sortedResults = await this.sortByExactMatch(searchResults, query);

    // Process results - if exactMatch, return only the best match
    return exactMatch
      ? sortedResults.length > 0
        ? sortedResults[0]
        : null
      : sortedResults;
  }

  /**
   * Add series IDs to search results
   * @param searchResults Anime search results
   * @returns Search results enriched with series IDs
   */
  private async addSeriesIds(searchResults) {
    // For each anime, find its seriesId
    const animeIds = searchResults.map((anime) => anime.id);

    if (animeIds.length === 0) {
      return [];
    }

    // Find all series that contain any of these anime IDs
    const seriesData = await this.seriesModel
      .find({
        $or: [
          { animeIds: { $in: animeIds } },
          { spinOffIds: { $in: animeIds } },
          { adaptationIds: { $in: animeIds } },
          { characterIds: { $in: animeIds } },
          { otherIds: { $in: animeIds } },
        ],
      })
      .select(
        'seriesId animeIds spinOffIds adaptationIds characterIds otherIds',
      )
      .lean();

    // Create a map of animeId to seriesId
    const animeToSeries = {};

    seriesData.forEach((series) => {
      const allSeriesAnimeIds = [
        ...series.animeIds,
        ...series.spinOffIds,
        ...series.adaptationIds,
        ...series.characterIds,
        ...series.otherIds,
      ];

      // Find which of our search results are in this series
      allSeriesAnimeIds.forEach((animeId) => {
        if (animeIds.includes(animeId)) {
          animeToSeries[animeId] = series.seriesId;
        }
      });
    });

    // Combine results
    return searchResults.map((anime) => ({
      ...anime,
      seriesId: animeToSeries[anime.id] || null,
    }));
  }

  /**
   * Normalize search query by removing special characters and noise words
   * @param input Original search query
   * @returns Normalized search query
   */
  private normalizeQuery(input: string): string {
    if (!input) {
      return '';
    }

    return input
      .toLowerCase()
      .replace(/[^a-z0-9\s]/gi, ' ') // Replace special chars with spaces
      .split(' ')
      .filter((word) => word && !this.NOISE_WORDS.includes(word))
      .join(' ')
      .trim();
  }
}
