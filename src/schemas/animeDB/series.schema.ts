import { Schema, model, Document, Types } from 'mongoose';

// Interface representing a relation between anime series
export interface IRelation {
  sourceAnimeId: string;
  targetAnimeId: string;
  relationType: string;
  direction: string;
}

// Interface representing a series document in MongoDB
export interface ISeries extends Document {
  _id: Types.ObjectId;
  seriesId: string;
  animeIds: string[];
  otherIds: string[];
  characterIds: string[];
  adaptationIds: string[];
  spinOffIds: string[];
  relations: IRelation[];

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

// Create the relation schema
const RelationSchema = new Schema<IRelation>({
  sourceAnimeId: {
    type: String,
    required: true,
  },
  targetAnimeId: {
    type: String,
    required: true,
  },
  relationType: {
    type: String,
    enum: [
      'SEQUEL',
      'PREQUEL',
      'ALTERNATIVE',
      'SPINOFF',
      'SIDE_STORY',
      'PARENT',
      'SUMMARY',
      'COMPILATION',
      'CONTAINS',
      'OTHER',
    ],
    required: true,
  },
  direction: {
    type: String,
    enum: ['forward', 'backward'],
    required: true,
  },
});

// Create the Series schema
const SeriesSchema = new Schema<ISeries>(
  {
    seriesId: {
      type: String,
      required: true,
      unique: true,
    },
    animeIds: {
      type: [String],
      required: true,
    },
    otherIds: {
      type: [String],
      default: [],
    },
    characterIds: {
      type: [String],
      default: [],
    },
    adaptationIds: {
      type: [String],
      default: [],
    },
    spinOffIds: {
      type: [String],
      default: [],
    },
    relations: {
      type: [RelationSchema],
      default: [],
    },

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
    collection: 'series',
  },
);

// Create the MongoDB validation schema
SeriesSchema.set('validateBeforeSave', true);

// Create the model
const SeriesModel = model<ISeries>('Series', SeriesSchema);

export { SeriesModel, SeriesSchema, RelationSchema };
