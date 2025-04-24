import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

@Schema({ timestamps: true })
export class RefreshToken extends Document {
  @Prop({ required: true, unique: true, index: true })
  token: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId: string;

  @Prop()
  deviceInfo: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  revoked: boolean;

  @Prop()
  revokedAt: Date;

  @Prop()
  replacedByToken: string;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// Add indexes for faster lookups
RefreshTokenSchema.index({ userId: 1 });
RefreshTokenSchema.index({ token: 1 });
RefreshTokenSchema.index({ expiresAt: 1 });
