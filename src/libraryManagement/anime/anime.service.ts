import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IAnime } from '../../schemas/animeDB/anime.schema';
import { ISeries } from '../../schemas/animeDB/series.schema';
import { SeriesChain, SeriesResponse } from './dto/series.dto';

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
   * Compute effective date for an anime
   * @param anime The anime data
   * @param animeId The anime ID for logging
   * @returns Date object representing the effective date
   * @throws InternalServerErrorException only if useDefaultOnMissing is false and no date info found
   */
  private getEffectiveDate(
    anime: IAnime,
    animeId: string,
    useDefaultOnMissing: boolean = false,
  ): Date {
    // Use startDate if available
    if (anime.startDate && anime.startDate.year) {
      const month = anime.startDate.month || 1;
      const day = anime.startDate.day || 1;
      return new Date(anime.startDate.year, month - 1, day);
    }

    // Otherwise map seasonYear plus season
    if (anime.seasonYear && anime.season) {
      let month = 0; // Default to January

      switch (anime.season.toUpperCase()) {
        case 'WINTER':
          month = 0;
          break; // January
        case 'SPRING':
          month = 3;
          break; // April
        case 'SUMMER':
          month = 6;
          break; // July
        case 'FALL':
          month = 9;
          break; // October
        default:
          month = 0;
          break; // Default to January
      }

      return new Date(anime.seasonYear, month, 1);
    }

    // Try to use updatedAt field
    if (anime.updatedAt) {
      const updateDate = new Date(anime.updatedAt);
      if (!isNaN(updateDate.getTime())) {
        this.logger.warn(
          `Using updatedAt as fallback date for anime ${animeId}`,
        );
        return updateDate;
      }
    }

    // If we're allowed to use a default date
    if (useDefaultOnMissing) {
      this.logger.warn(
        `No date info for anime ${animeId}, using default date (unix epoch)`,
      );
      return new Date(0); // Return Unix epoch (1970-01-01) as a fallback
    }

    // If neither is available and we don't use default, throw an error
    throw new InternalServerErrorException(
      `Missing date info for anime ${animeId}`,
    );
  }

  /**
   * Get series data by ID with enhanced processing
   * @param id The series ID
   * @param _detailed Unused parameter kept for backward compatibility
   * @param _include Unused parameter kept for backward compatibility
   * @returns Enhanced series data with main and sub series
   */
  async getSeriesWithDetails(
    id: string,
    // _detailed: boolean = false,
    // _include?: string[],
  ): Promise<any> {
    // For backwards compatibility, keep the old method signature but ignore the parameters
    return this.getSeriesById(id);
  }

  /**
   * Get series by ID with enhanced processing following new requirements
   * @param id The series ID
   * @returns Enhanced series data with main and sub series
   */
  async getSeriesById(id: string): Promise<SeriesResponse> {
    this.logger.log(`Getting enhanced series data for ID: ${id}`);

    // Check cache first
    const cacheKey = `series_${id}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.logger.debug(`Using cached data for series ${id}`);
      return cached;
    }

    // Fetch series by ID
    const series = await this.seriesModel.findOne({ seriesId: id }).exec();

    if (!series) {
      throw new NotFoundException(`Series with ID ${id} not found`);
    }

    // Get all unique IDs to fetch
    const allAnimeIds = [
      ...new Set([
        ...series.animeIds,
        ...series.spinOffIds,
        ...series.adaptationIds,
        ...series.characterIds,
        ...series.otherIds,
      ]),
    ];

    // Fetch full anime metadata for all IDs
    const animeData = await this.animeModel
      .find({ id: { $in: allAnimeIds } })
      .select({
        id: 1,
        title: 1,
        type: 1,
        startDate: 1,
        seasonYear: 1,
        season: 1,
        updatedAt: 1,
        format: 1,
        status: 1,
        episodes: 1,
        duration: 1,
        description: 1,
        images: 1,
        bannerImage: 1,
        genres: 1,
        tags: 1,
        averageScore: 1,
        popularity: 1,
        studios: 1,
        source: 1,
        countryOfOrigin: 1,
        isLicensed: 1,
        isAdult: 1,
        nextAiringEpisode: 1,
        relations: 1,
        characters: 1,
        staff: 1,
        mediaListEntry: 1,
        siteUrl: 1,
        externalLinks: 1,
        streamingEpisodes: 1,
        trailer: 1,
        rankings: 1,
        reviews: 1,
        recommendations: 1,
        stats: 1,
        airingSchedule: 1,
        trends: 1,
        endDate: 1,
        createdAt: 1,
      })
      .exec();

    // Create a map for quick access to anime data by ID
    const animeMap: { [key: string]: any } = {};
    animeData.forEach((anime: any) => {
      animeMap[anime._doc.id] = anime._doc;
    });

    // Ensure we only include IDs that have valid anime data in our graph and chains
    const validAnimeIds = new Set(Object.keys(animeMap));

    // Log warning for any anime IDs in the series that don't have data
    series.animeIds.forEach((id) => {
      if (!validAnimeIds.has(id)) {
        this.logger.warn(
          `Series contains animeId "${id}" which has no data in the database`,
        );
      }
    });

    // Build directed graph from relations array, keeping only SEQUEL relations
    const preqGraph = this.buildRelationGraph(series.relations, validAnimeIds);

    // Find root nodes and build chains
    const chains = this.buildAnimeChains(series, preqGraph, validAnimeIds);

    if (chains.length === 0) {
      this.logger.warn(
        'No valid chains could be constructed, creating single-anime chains',
      );

      // If no chains were created, make simple one-anime chains for valid IDs
      series.animeIds
        .filter((id) => validAnimeIds.has(id))
        .forEach((id) => {
          chains.push([id]);
        });

      if (chains.length === 0) {
        throw new InternalServerErrorException(
          'No valid anime data found for this series',
        );
      }
    }

    // Determine main and sub series
    const { mainSeries, subSeries } = this.determineMainAndSubSeries(
      chains,
      animeMap,
      series,
    );

    // Build final response
    const response: SeriesResponse = {
      seriesId: series.seriesId,
      mainSeries,
      subSeries,
      otherIds: series.otherIds.map((id) => animeMap[id]).filter(Boolean),
      characterIds: series.characterIds
        .map((id) => animeMap[id])
        .filter(Boolean),
      adaptationIds: series.adaptationIds
        .map((id) => animeMap[id])
        .filter(Boolean),
      spinOffIds: series.spinOffIds.map((id) => animeMap[id]).filter(Boolean),
      relations: series.relations,
      manuallyModified: series.manuallyModified,
      updatedAt: series.updatedAt,
      lastAutomatedUpdate: series.lastAutomatedUpdate,
    };

    // Cache the result
    this.setInCache(cacheKey, response);

    return response;
  }

  /**
   * Build directed graph from series relations
   * @param relations Array of relations from series
   * @param validAnimeIds Set of valid anime IDs
   * @returns Map representing the directed graph
   */
  private buildRelationGraph(
    relations: Array<{
      sourceAnimeId: string;
      targetAnimeId: string;
      relationType: string;
      direction: string;
    }>,
    validAnimeIds: Set<string>,
  ): Map<string, string[]> {
    const preqGraph = new Map<string, string[]>();
    const filteredRelations = relations.filter(
      (r) => r.relationType === 'SEQUEL',
    );

    // Remove duplicates from relations and ensure both source and target exist
    const uniqueRelations = filteredRelations.filter(
      (rel, index, self) =>
        index ===
          self.findIndex(
            (r) =>
              r.sourceAnimeId === rel.sourceAnimeId &&
              r.targetAnimeId === rel.targetAnimeId,
          ) &&
        validAnimeIds.has(rel.sourceAnimeId) &&
        validAnimeIds.has(rel.targetAnimeId),
    );

    if (uniqueRelations.length < filteredRelations.length) {
      this.logger.warn(
        `Removed ${
          filteredRelations.length - uniqueRelations.length
        } relations with missing anime data`,
      );
    }

    // Populate the graph
    uniqueRelations.forEach((rel) => {
      if (!preqGraph.has(rel.sourceAnimeId)) {
        preqGraph.set(rel.sourceAnimeId, []);
      }
      preqGraph.get(rel.sourceAnimeId)!.push(rel.targetAnimeId);
    });

    return preqGraph;
  }

  /**
   * Build anime chains from series data and relation graph
   * @param series The series document
   * @param preqGraph The directed relation graph
   * @param validAnimeIds Set of valid anime IDs
   * @returns Array of anime chains (arrays of anime IDs)
   */
  private buildAnimeChains(
    series: ISeries,
    preqGraph: Map<string, string[]>,
    validAnimeIds: Set<string>,
  ): string[][] {
    // Find root nodes (those with no incoming edges)
    const incomingEdges = new Map<string, string[]>();

    // Populate incoming edges map
    for (const [source, targets] of preqGraph.entries()) {
      for (const target of targets) {
        if (!incomingEdges.has(target)) {
          incomingEdges.set(target, []);
        }
        incomingEdges.get(target)!.push(source);
      }
    }

    // Root nodes are those with no incoming edges
    const rootNodes: string[] = [];
    series.animeIds
      .filter((id) => validAnimeIds.has(id))
      .forEach((id) => {
        if (!incomingEdges.has(id) || incomingEdges.get(id)!.length === 0) {
          rootNodes.push(id);
        }
      });

    this.logger.log(`Found ${rootNodes.length} root nodes for chains`);

    // Extract linear chains by walking from each root node
    const chains: string[][] = [];
    const visited = new Set<string>();

    // Function to recursively build a chain starting from a node
    const buildChain = (
      currentId: string,
      chain: string[] = [],
    ): string[][] => {
      const newChain = [...chain, currentId];
      visited.add(currentId);

      // If this node has outgoing edges, follow them
      if (preqGraph.has(currentId) && preqGraph.get(currentId)!.length > 0) {
        const nextNodes = preqGraph.get(currentId)!;

        // If there are multiple next nodes, create branching chains
        if (nextNodes.length > 1) {
          const allChains: string[][] = [];

          // For each next node, create a separate chain branch
          for (const nextId of nextNodes) {
            if (!visited.has(nextId)) {
              // Create a temporary visited set for this branch to prevent cycles
              // but allow the same node to be visited in different branches
              const branchVisited = new Set(visited);

              // Mark as visited for this branch
              branchVisited.add(nextId);

              // Start a new chain from the current branch point
              const branchChains = this.buildChainBranch(
                nextId,
                [...newChain],
                branchVisited,
                preqGraph,
              );
              allChains.push(...branchChains);
            } else {
              // If already visited, just add the current chain
              allChains.push(newChain);
            }
          }

          return allChains;
        } else {
          // Single next node case
          const nextId = nextNodes[0];
          if (!visited.has(nextId)) {
            return buildChain(nextId, newChain);
          }
        }
      }

      // End of chain
      return [newChain];
    };

    // Build chains from each root node
    rootNodes.forEach((rootId) => {
      if (!visited.has(rootId)) {
        const newChains = buildChain(rootId);
        chains.push(...newChains);
      }
    });

    // If no chains were built from root nodes, build chains from any unvisited nodes
    if (
      chains.length === 0 ||
      series.animeIds.some((id) => validAnimeIds.has(id) && !visited.has(id))
    ) {
      series.animeIds
        .filter((id) => validAnimeIds.has(id) && !visited.has(id))
        .forEach((id) => {
          const newChains = buildChain(id);
          chains.push(...newChains);
        });
    }

    // Filter out redundant sub-chains
    return this.filterRedundantChains(chains);
  }

  /**
   * Helper function to build a chain branch after the point where multiple paths split
   * @param currentId Current anime ID
   * @param chain Current chain so far
   * @param branchVisited Set of visited nodes for this branch
   * @param preqGraph The directed graph of relations
   * @returns Array of chains from this branch
   */
  private buildChainBranch(
    currentId: string,
    chain: string[],
    branchVisited: Set<string>,
    preqGraph: Map<string, string[]>,
  ): string[][] {
    const newChain = [...chain, currentId];

    // If this node has outgoing edges, follow them
    if (preqGraph.has(currentId) && preqGraph.get(currentId)!.length > 0) {
      const nextNodes = preqGraph.get(currentId)!;

      // If there are multiple next nodes, create more branching chains
      if (nextNodes.length > 1) {
        const allChains: string[][] = [];

        // For each next node, create a separate chain branch
        for (const nextId of nextNodes) {
          if (!branchVisited.has(nextId)) {
            // Create a temporary visited set for this new branch
            const newBranchVisited = new Set(branchVisited);
            newBranchVisited.add(nextId);

            // Start a new chain from this branch point
            const branchChains = this.buildChainBranch(
              nextId,
              [...newChain],
              newBranchVisited,
              preqGraph,
            );
            allChains.push(...branchChains);
          } else {
            // If already visited, just add the current chain
            allChains.push(newChain);
          }
        }

        return allChains;
      } else {
        // Single next node case
        const nextId = nextNodes[0];
        if (!branchVisited.has(nextId)) {
          // Mark as visited for this branch
          branchVisited.add(nextId);
          return this.buildChainBranch(
            nextId,
            newChain,
            branchVisited,
            preqGraph,
          );
        }
      }
    }

    // End of chain
    return [newChain];
  }

  /**
   * Filter out redundant sub-chains that are completely contained in other chains
   * @param chains Array of chains to filter
   * @returns Filtered array of chains
   */
  private filterRedundantChains(chains: string[][]): string[][] {
    const filteredChains: string[][] = [];
    const chainStrings = chains.map((chain) => chain.join(','));

    // Helper function to check if a chain is a sub-sequence of another chain
    const isSubSequence = (subChain: string, mainChain: string): boolean => {
      const subArr = subChain.split(',');
      const mainArr = mainChain.split(',');

      // Short-circuit if the sub-chain is longer than the main chain
      if (subArr.length >= mainArr.length) return false;

      // Check if the entire sub-chain exists in order within the main chain
      let subIndex = 0;
      let mainIndex = 0;

      while (subIndex < subArr.length && mainIndex < mainArr.length) {
        if (subArr[subIndex] === mainArr[mainIndex]) {
          subIndex++;
        }
        mainIndex++;
      }

      return subIndex === subArr.length;
    };

    // Add each chain if it's not a sub-sequence of any other chain
    chains.forEach((chain, idx) => {
      const chainStr = chainStrings[idx];
      let isRedundant = false;

      for (let i = 0; i < chainStrings.length; i++) {
        if (i !== idx && isSubSequence(chainStr, chainStrings[i])) {
          isRedundant = true;
          this.logger.debug(
            `Chain ${chainStr} is a subset of ${chainStrings[i]} - skipping`,
          );
          break;
        }
      }

      if (!isRedundant) {
        filteredChains.push(chain);
      }
    });

    return filteredChains;
  }

  /**
   * Determine main and sub series from chains
   * @param chains Array of anime chains
   * @param animeMap Map of anime data by ID
   * @param series The series document
   * @returns Object containing mainSeries and subSeries
   */
  private determineMainAndSubSeries(
    chains: string[][],
    animeMap: { [key: string]: any },
    series: ISeries,
  ): { mainSeries: SeriesChain; subSeries: SeriesChain[] } {
    // Filter chains for main series candidates (first anime has type="ANIME")
    const mainCandidates = chains.filter((chain) => {
      const firstAnime = animeMap[chain[0]];
      return firstAnime && firstAnime.type === 'ANIME';
    });

    if (mainCandidates.length === 0 && chains.length > 0) {
      // If no main candidates, just use the first chain
      mainCandidates.push(chains[0]);
    }

    // Find the earliest chain to be the main series
    let mainIdx = this.findEarliestChain(mainCandidates, animeMap);

    // Fallback if no chain is found
    if (mainIdx === -1 && mainCandidates.length > 0) {
      mainIdx = 0;
      this.logger.warn(
        `Using first chain as fallback main series: ${mainCandidates[0][0]}`,
      );
    }

    // Format main series
    const mainChain = mainCandidates[mainIdx];
    const firstMainId = mainChain[0];

    // Ensure we have data for all anime in the main chain
    const validAnimeIds = new Set(Object.keys(animeMap));
    const mainAnimeData = mainChain
      .filter((id) => validAnimeIds.has(id))
      .map((id) => animeMap[id]);

    // If main chain has no valid anime data, throw error
    if (mainAnimeData.length === 0) {
      throw new InternalServerErrorException(
        'Main series chain contains no valid anime data',
      );
    }

    // Use the first anime's title that we have data for
    const mainTitle = mainAnimeData[0].title?.userPreferred || 'Unknown';

    const mainSeries: SeriesChain = {
      title: mainTitle + ' series',
      anime: mainAnimeData,
      count: mainAnimeData.length,
    };

    // Format sub series
    const subSeries = this.formatSubSeries(
      chains,
      mainCandidates[mainIdx],
      firstMainId,
      animeMap,
      validAnimeIds,
      series,
    );

    return { mainSeries, subSeries };
  }

  /**
   * Find the earliest chain based on effective dates
   * @param mainCandidates Candidate chains for main series
   * @param animeMap Map of anime data by ID
   * @returns Index of the earliest chain
   */
  private findEarliestChain(
    mainCandidates: string[][],
    animeMap: { [key: string]: any },
  ): number {
    let mainIdx = -1;
    let earliestDate: Date | null = null;
    const tiedCandidates: string[] = [];

    // First pass - try to find chains with proper date information
    mainCandidates.forEach((chain, idx) => {
      const firstAnime = animeMap[chain[0]];
      try {
        // Try to get a proper date without falling back to default
        const effectiveDate = this.getEffectiveDate(
          firstAnime as unknown as IAnime,
          chain[0],
          false, // Don't use default date in first pass
        );

        if (earliestDate === null || effectiveDate < earliestDate) {
          earliestDate = effectiveDate;
          mainIdx = idx;
          tiedCandidates.length = 0; // Clear tied candidates
          tiedCandidates.push(chain[0]);
        } else if (
          earliestDate &&
          effectiveDate.getTime() === earliestDate.getTime()
        ) {
          tiedCandidates.push(chain[0]);
        }
      } catch (error) {
        // Skip this chain if we can't determine its date
        this.logger.warn(
          `Could not determine date for anime ${chain[0]}: ${error.message}`,
        );
      }
    });

    // If no chains have valid date information, use a fallback approach
    if (mainIdx === -1) {
      this.logger.warn(
        'No chains with valid date information found, using fallback selection method',
      );

      // Try again with allowing default dates
      for (let idx = 0; idx < mainCandidates.length; idx++) {
        const chain = mainCandidates[idx];
        const firstAnime = animeMap[chain[0]];
        try {
          // Use default date as fallback
          const fallbackDate = this.getEffectiveDate(
            firstAnime as unknown as IAnime,
            chain[0],
            true, // Use default date in second pass
          );

          if (earliestDate === null || fallbackDate < earliestDate) {
            earliestDate = fallbackDate;
            mainIdx = idx;
            this.logger.warn(
              `Found fallback date for anime ${chain[0]}, using as main series`,
            );
            break; // Use the first one we find with a fallback date
          }
        } catch (error) {
          // This shouldn't happen since we're using default dates
          this.logger.error(
            `Unexpected error with fallback date for ${chain[0]}: ${error.message}`,
          );
        }
      }
    }

    if (tiedCandidates.length > 1) {
      // Relaxing this constraint - just pick the first tied candidate
      this.logger.warn(
        `Multiple main-series candidates found, using first one: ${tiedCandidates[0]} (tied with: ${tiedCandidates
          .slice(1)
          .join(', ')})`,
      );
      // Find which mainCandidate index corresponds to our selected tiedCandidate
      const selectedId = tiedCandidates[0];
      mainIdx = mainCandidates.findIndex((chain) => chain[0] === selectedId);
    }

    return mainIdx;
  }

  /**
   * Format sub-series data
   * @param chains All chains
   * @param mainChain The main chain
   * @param firstMainId ID of the first anime in main chain
   * @param animeMap Map of anime data by ID
   * @param validAnimeIds Set of valid anime IDs
   * @param series The series document
   * @returns Array of SeriesChain objects for sub-series
   */
  private formatSubSeries(
    chains: string[][],
    mainChain: string[],
    firstMainId: string,
    animeMap: { [key: string]: any },
    validAnimeIds: Set<string>,
    series: ISeries,
  ): SeriesChain[] {
    return chains
      .filter((chain) => chain !== mainChain) // Exclude main series
      .map((chain) => {
        // Filter to only include anime with data
        const validChain = chain.filter((id) => validAnimeIds.has(id));

        if (validChain.length === 0) {
          this.logger.warn('Skipping sub-series with no valid anime data');
          return null;
        }

        const firstId = validChain[0];
        const subSeriesAnime = validChain.map((id) => animeMap[id]);

        // Double-check that we have the first anime
        if (!animeMap[firstId] || !animeMap[firstId].title) {
          this.logger.warn(
            `Missing title data for anime ${firstId}, using fallback title`,
          );

          // Create a basic structure with fallback data
          return {
            title: 'Unknown series',
            anime: subSeriesAnime,
            count: subSeriesAnime.length,
            relationToMain: null,
          };
        }

        // Determine relationToMain
        const relationToMain =
          series.relations.find(
            (rel) =>
              (rel.sourceAnimeId === firstId &&
                rel.targetAnimeId === firstMainId) ||
              (rel.sourceAnimeId === firstMainId &&
                rel.targetAnimeId === firstId),
          ) || null;

        return {
          title: animeMap[firstId].title.userPreferred + ' series',
          anime: subSeriesAnime,
          count: subSeriesAnime.length,
          relationToMain,
        };
      })
      .filter((series) => series !== null) as SeriesChain[];
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
