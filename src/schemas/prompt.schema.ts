import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Prompt extends Document {
  @Prop({ required: true, unique: true })
  promptId: string;

  @Prop()
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: Date.now })
  createdAt: number;

  @Prop({ default: Date.now })
  updatedAt: number;
}

export const PromptSchema = SchemaFactory.createForClass(Prompt);
