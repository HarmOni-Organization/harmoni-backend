import { IsBoolean, IsOptional, IsArray, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IRelation } from '../../../schemas/animeDB/series.schema';

/**
 * DTO for getting series with optional detail level and filters
 */
export class GetSeriesDto {
  @ApiProperty({
    description: 'Whether to include detailed anime information',
    type: Boolean,
    required: false,
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  detailed?: boolean = false;

  @ApiProperty({
    description:
      'Specific anime ID arrays to include in the response (e.g., animeIds,adaptationIds)',
    type: [String],
    required: false,
    example: ['animeIds', 'characterIds'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  include?: string[];
}

// Interface for anime data
export interface AnimeData {
  _id: string;
  id: string;
  title: {
    userPreferred: string;
  };
  averageScore: number;
  meanScore: number;
  description: string;
  countryOfOrigin: string;
  characters: any[];
  duration: number;
  episodes: number;
  format: string;
  genres: string[];
  hashtag: string;
  idMal: number;
  images: any;
  isAdult: boolean;
  manuallyModified: any;
  rankings: any[];
  startDate: {
    year: number;
    month: number;
    day: number;
  };
  endDate: {
    year: number;
    month: number;
    day: number;
  };
  season: string;
  seasonInt: number;
  seasonYear: number;
  seriesId: string;
  siteUrl: string;
  source: string;
  staff: any[];
  status: string;
  streamingEpisodes: any[];
  studios: any[];
  synonyms: string[];
  tags: any[];
  trailer: any;
  type: string;
  updatedAt: string;
}

// Interface for series chain
export interface SeriesChain {
  title: string;
  anime: AnimeData[];
  count: number;
  relationToMain?: {
    sourceAnimeId: string;
    targetAnimeId: string;
    relationType: string;
    direction: string;
  } | null;
}

// Interface definition for the response
export interface SeriesResponse {
  seriesId: string;
  others: AnimeData[];
  characters: AnimeData[];
  adaptations: AnimeData[];
  spinOffs: AnimeData[];
  relations: IRelation[];
  updatedAt: Date;
  lastAutomatedUpdate: Date;
  manuallyModified: {
    isModified: boolean;
    modifiedAt: Date;
    modifiedFields: string[];
    modifiedBy: string;
    comments: string;
  };
  mainSeries: SeriesChain;
  subSeries: SeriesChain[];
}
