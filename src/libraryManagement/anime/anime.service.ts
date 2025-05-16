import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IAnime } from '../../schemas/animeDB/anime.schema';

@Injectable()
export class AnimeService {
  private readonly logger = new Logger(AnimeService.name);

  constructor(
    @InjectModel('Anime', 'animeDB') private animeModel: Model<any>, // <-- include the connection name
    @InjectModel('Series', 'animeDB') private seriesModel: Model<any>,
    // private readonly animeModel: Model<IAnime>,
  ) {}

  /**
   * Get anime data by ID
   * @param id The anime ID
   * @returns Anime data
   */
  async getAnimeMockData(id: string): Promise<IAnime> {
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
  async getAnimeByIdsMockData(ids: string[]): Promise<IAnime[]> {
    this.logger.log(`Getting anime data for IDs: ${ids.join(', ')}`);
    const anime = await this.animeModel.find({ id: { $in: ids } }).exec();
    return anime;
  }

  /**
   * Get series data by ID
   * @param id The series ID
   * @returns Series data with anime details
   */
  async getSeriesMockData(id: string): Promise<any> {
    this.logger.log(`Getting series data for ID: ${id}`);
    // TODO: Implement series data retrieval once Series schema is available
    throw new Error('Series data retrieval not implemented yet');
  }
}
