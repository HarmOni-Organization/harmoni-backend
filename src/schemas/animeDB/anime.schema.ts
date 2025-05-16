import { Schema, model, Document, Types } from 'mongoose';

// Interface representing an anime document in MongoDB
export interface IAnime extends Document {
  _id: Types.ObjectId;
  animeId: string;
  idMal: number;
  type: string;
  format: string;
  status: string;
  description: string;
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
  seasonYear: number;
  seasonInt: number;
  episodes: number;
  duration: number;
  chapters: number;
  volumes: number;
  countryOfOrigin: string;
  isLicensed: boolean;
  source: string;
  hashtag: string;
  genres: string[];
  synonyms: string[];
  tags: Array<{
    id: number;
    name: string;
    description: string;
    category: string;
    rank: number;
    isGeneralSpoiler: boolean;
    isMediaSpoiler: boolean;
    isAdult: boolean;
  }>;
  averageScore: number;
  meanScore: number;
  popularity: number;
  favourites: number;
  trending: number;
  rankings: Array<{
    id: number;
    rank: number;
    type: string;
    format: string;
    year: number;
    season: string;
    allTime: boolean;
    context: string;
  }>;
  isFavourite: boolean;
  isAdult: boolean;
  isLocked: boolean;
  siteUrl: string;
  externalLinks: Array<{
    id: number;
    url: string;
    site: string;
    type: string;
    language: string;
    color: string;
    icon: string;
    notes: string;
    isDisabled: boolean;
  }>;
  streamingEpisodes: Array<{
    title: string;
    thumbnail: string;
    url: string;
    site: string;
  }>;
  characters: Array<{
    id: string;
    role: string;
    name: string;
    image: string;
  }>;
  staff: Array<{
    id: number;
    role: string;
    node: {
      id: number;
      name: {
        full: string;
        native: string;
      };
      languageV2: string;
      image: {
        large: string;
        medium: string;
      };
    };
  }>;

  // Tracking fields
  updatedAt: Date;
  lastAutomatedUpdate: Date;
  manuallyModified: {
    isModified: boolean;
    modifiedAt: Date;
    modifiedFields: string[];
    modifiedBy: string;
    comments: string;
  };
}

// Create the Anime schema
const AnimeSchema = new Schema<IAnime>(
  {
    animeId: {
      type: String,
      required: true,
      unique: true,
    },
    idMal: {
      type: Number,
    },
    type: {
      type: String,
      enum: ['ANIME', 'MANGA'],
      default: 'ANIME',
    },
    format: {
      type: String,
      enum: [
        'TV',
        'TV_SHORT',
        'MOVIE',
        'SPECIAL',
        'OVA',
        'ONA',
        'MUSIC',
        'MANGA',
        'NOVEL',
        'ONE_SHOT',
      ],
    },
    status: {
      type: String,
      enum: [
        'FINISHED',
        'RELEASING',
        'NOT_YET_RELEASED',
        'CANCELLED',
        'HIATUS',
      ],
    },
    description: {
      type: String,
    },
    startDate: {
      year: Number,
      month: Number,
      day: Number,
    },
    endDate: {
      year: Number,
      month: Number,
      day: Number,
    },
    season: String,
    seasonYear: Number,
    seasonInt: Number,
    episodes: Number,
    duration: Number,
    chapters: Number,
    volumes: Number,
    countryOfOrigin: String,
    isLicensed: Boolean,
    source: String,
    hashtag: String,
    genres: [String],
    synonyms: [String],
    tags: [
      {
        id: Number,
        name: String,
        description: String,
        category: String,
        rank: Number,
        isGeneralSpoiler: Boolean,
        isMediaSpoiler: Boolean,
        isAdult: Boolean,
      },
    ],
    averageScore: Number,
    meanScore: Number,
    popularity: Number,
    favourites: Number,
    trending: Number,
    rankings: [
      {
        id: Number,
        rank: Number,
        type: String,
        format: String,
        year: Number,
        season: String,
        allTime: Boolean,
        context: String,
      },
    ],
    isFavourite: Boolean,
    isAdult: Boolean,
    isLocked: Boolean,
    siteUrl: String,
    externalLinks: [
      {
        id: Number,
        url: String,
        site: String,
        type: String,
        language: String,
        color: String,
        icon: String,
        notes: String,
        isDisabled: Boolean,
      },
    ],
    streamingEpisodes: [
      {
        title: String,
        thumbnail: String,
        url: String,
        site: String,
      },
    ],
    characters: [
      {
        id: String,
        role: String,
        name: String,
        image: String,
      },
    ],
    staff: [
      {
        id: Number,
        role: String,
        node: {
          id: Number,
          name: {
            full: String,
            native: String,
          },
          languageV2: String,
          image: {
            large: String,
            medium: String,
          },
        },
      },
    ],
    // Tracking fields
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    lastAutomatedUpdate: {
      type: Date,
      default: Date.now,
    },
    manuallyModified: {
      isModified: {
        type: Boolean,
        default: false,
      },
      modifiedAt: Date,
      modifiedFields: [String],
      modifiedBy: String,
      comments: String,
    },
  },
  {
    timestamps: true,
    collection: 'anime',
  },
);

// Create indexes for performance optimization (explicitly, avoiding duplicates)
AnimeSchema.index({ idMal: 1 });
AnimeSchema.index({ title: 'text', description: 'text' });
AnimeSchema.index({ format: 1 });
AnimeSchema.index({ status: 1 });
AnimeSchema.index({ genres: 1 });
AnimeSchema.index({ 'tags.name': 1 });

// Create the MongoDB validation schema
AnimeSchema.set('validateBeforeSave', true);

// Create the model
const AnimeModel = model<IAnime>('Anime', AnimeSchema);

export { AnimeModel, AnimeSchema };
