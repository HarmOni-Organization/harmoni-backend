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

    // Score and sort results by relevance
    const scoredResults = this.scoreResults(searchResults, query, queryWords);

    // Process results - if exactMatch, return only the best match
    const finalResults = exactMatch
      ? scoredResults.length > 0
        ? [scoredResults[0]]
        : []
      : scoredResults.slice(0, 10);

    const results = await this.addSeriesIds(finalResults);

    // If exactMatch is true, return only the single best match rather than an array
    return exactMatch ? (results.length > 0 ? results[0] : null) : results;
  }

  /**
   * Score search results by relevance to the query
   * @param results Search results
   * @param query Search query
   * @param queryWords Individual words from the query
   * @returns Scored and sorted results
   */
  private scoreResults(results, query, queryWords) {
    const queryLower = query.toLowerCase();
    const queryNoSpace = queryLower.replace(/\s+/g, '');
    // Remove any symbols from the query for cleaner comparison
    const queryNoPunctuation = queryLower.replace(/[^\w\s]/g, '');

    return results
      .map((result) => {
        // Start with a base score
        let score = 0;
        let bestMatchField = '';
        let matchDetails = [];

        // Check each title field
        const titleFields = ['english', 'romaji', 'native', 'userPreferred'];
        for (const field of titleFields) {
          if (result.title && result.title[field]) {
            const titleValue = result.title[field].toLowerCase();
            const titleNoSpace = titleValue.replace(/\s+/g, '');
            // Clean the title of punctuation for comparison
            const titleNoPunctuation = titleValue.replace(/[^\w\s]/g, '');

            // Exact match gets highest score
            if (titleValue === queryLower) {
              score = 100;
              bestMatchField = field;
              matchDetails.push('exact match');
              break;
            }

            // Starts with query gets high score
            if (titleValue.startsWith(queryLower)) {
              const matchScore =
                80 + (queryLower.length / titleValue.length) * 20;
              if (matchScore > score) {
                score = matchScore;
                bestMatchField = field;
                matchDetails = ['starts with'];
              }
            }

            // Contains query gets medium score
            else if (titleValue.includes(queryLower)) {
              const matchScore =
                60 + (queryLower.length / titleValue.length) * 20;
              if (matchScore > score) {
                score = matchScore;
                bestMatchField = field;
                matchDetails = ['contains'];
              }
            }

            // No-space match (overlordii matches "overlord ii")
            else if (titleNoSpace.includes(queryNoSpace)) {
              const matchScore =
                50 + (queryNoSpace.length / titleNoSpace.length) * 10;
              if (matchScore > score) {
                score = matchScore;
                bestMatchField = field;
                matchDetails = ['no-space match'];
              }
            }

            // No-punctuation match
            else if (titleNoPunctuation.includes(queryNoPunctuation)) {
              const matchScore =
                45 +
                (queryNoPunctuation.length / titleNoPunctuation.length) * 10;
              if (matchScore > score) {
                score = matchScore;
                bestMatchField = field;
                matchDetails = ['no-punctuation match'];
              }
            }

            // Word-level matching (multiple words in query match)
            else {
              let wordMatches = 0;
              let wordWeight = 0;

              for (const word of queryWords) {
                if (word.length < 2) continue; // Skip very short words

                if (titleValue.includes(word.toLowerCase())) {
                  wordMatches++;
                  wordWeight += word.length;
                }
              }

              if (wordMatches > 0) {
                // More matching words and longer words = higher score
                const wordCoverage = wordWeight / queryNoPunctuation.length;
                const matchScore = 35 + wordMatches * 5 + wordCoverage * 20;

                if (matchScore > score) {
                  score = matchScore;
                  bestMatchField = field;
                  matchDetails = [
                    `${wordMatches}/${queryWords.length} words match`,
                  ];
                }
              }
            }
          }
        }

        // Check synonyms with similar logic
        if (result.synonyms && Array.isArray(result.synonyms)) {
          for (const synonym of result.synonyms) {
            if (typeof synonym !== 'string') continue;

            const synonymLower = synonym.toLowerCase();
            const synonymNoSpace = synonymLower.replace(/\s+/g, '');
            const synonymNoPunctuation = synonymLower.replace(/[^\w\s]/g, '');

            // Exact match gets high score
            if (synonymLower === queryLower) {
              const matchScore = 75;
              if (matchScore > score) {
                score = matchScore;
                bestMatchField = 'synonym';
                matchDetails = ['exact match'];
              }
              break;
            }

            // Starts with query
            if (synonymLower.startsWith(queryLower)) {
              const matchScore =
                65 + (queryLower.length / synonymLower.length) * 10;
              if (matchScore > score) {
                score = matchScore;
                bestMatchField = 'synonym';
                matchDetails = ['starts with'];
              }
            }

            // Contains query
            else if (synonymLower.includes(queryLower)) {
              const matchScore =
                55 + (queryLower.length / synonymLower.length) * 10;
              if (matchScore > score) {
                score = matchScore;
                bestMatchField = 'synonym';
                matchDetails = ['contains'];
              }
            }

            // No-space match
            else if (synonymNoSpace.includes(queryNoSpace)) {
              const matchScore =
                45 + (queryNoSpace.length / synonymNoSpace.length) * 10;
              if (matchScore > score) {
                score = matchScore;
                bestMatchField = 'synonym';
                matchDetails = ['no-space match'];
              }
            }

            // No-punctuation match
            else if (synonymNoPunctuation.includes(queryNoPunctuation)) {
              const matchScore =
                40 +
                (queryNoPunctuation.length / synonymNoPunctuation.length) * 10;
              if (matchScore > score) {
                score = matchScore;
                bestMatchField = 'synonym';
                matchDetails = ['no-punctuation match'];
              }
            }

            // Word-level matching for synonyms
            else {
              let wordMatches = 0;
              let wordWeight = 0;

              for (const word of queryWords) {
                if (word.length < 2) continue;

                if (synonymLower.includes(word.toLowerCase())) {
                  wordMatches++;
                  wordWeight += word.length;
                }
              }

              if (wordMatches > 0) {
                const wordCoverage = wordWeight / queryNoPunctuation.length;
                const matchScore = 30 + wordMatches * 5 + wordCoverage * 15;

                if (matchScore > score) {
                  score = matchScore;
                  bestMatchField = 'synonym';
                  matchDetails = [
                    `${wordMatches}/${queryWords.length} words match`,
                  ];
                }
              }
            }
          }
        }

        // Special case for initial matches (handling "overlord pleple" -> "Overlord: Ple Ple Pleiades")
        // Check for titleWords matching queryWords by initial characters
        const titleWordsMap = {};
        titleFields.forEach((field) => {
          if (result.title && result.title[field]) {
            const titleWords = result.title[field]
              .toLowerCase()
              .split(/[\s:,-]+/)
              .filter((w) => w.length > 0);
            titleWords.forEach((word) => {
              if (!titleWordsMap[word.charAt(0)]) {
                titleWordsMap[word.charAt(0)] = [];
              }
              titleWordsMap[word.charAt(0)].push(word);
            });
          }
        });

        // Check if query words match title word initials
        let initialMatches = 0;
        for (const qWord of queryWords) {
          const initial = qWord.charAt(0);
          if (titleWordsMap[initial]) {
            // Check if any title word starting with this initial
            // shares more characters with the query word
            const matchingWords = titleWordsMap[initial].filter((tWord) => {
              // Check if first 2-3 chars match
              return tWord.startsWith(
                qWord.substring(0, Math.min(3, qWord.length)),
              );
            });

            if (matchingWords.length > 0) initialMatches++;
          }
        }

        if (initialMatches > 1) {
          // If multiple query words match title word initials, this is probably a good match
          const initialMatchScore = 40 + initialMatches * 8;
          if (initialMatchScore > score) {
            score = initialMatchScore;
            bestMatchField = 'initial matches';
            matchDetails = [`${initialMatches} initial matches`];
          }
        }

        // Remove matchDetails from result if needed
        return {
          ...result,
          score,
          matchedOn: bestMatchField,
          matchDetails, // Remove this line in production
        };
      })
      .filter((result) => result.score > 0) // Only include results with a score
      .sort((a, b) => b.score - a.score); // Sort by score descending
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
