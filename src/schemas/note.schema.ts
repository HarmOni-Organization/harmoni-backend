import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NoteDocument = Note & Document;

@Schema({ timestamps: true }) // Adds createdAt and updatedAt fields
export class Note {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId; // Reference to the user who owns the note

  @Prop({ required: true })
  content: string; // The note content

  @Prop({ type: [String], default: [] })
  tags: string[]; // Tags for categorizing notes

  @Prop({ default: false })
  isPinned: boolean; // Whether the note is pinned for quick access

  @Prop({ default: null })
  context: string; // e.g., 'anime', 'task', 'quote'

  @Prop({ enum: ['synced', 'pending', 'conflict'], default: 'synced' })
  syncStatus: string; // Status of synchronization

  @Prop({ default: null })
  clientId: string; // For offline sync identification

  @Prop({ default: Date.now })
  lastSyncedAt: Date; // When the note was last synced

  @Prop({ default: Date.now })
  lastModified: Date; // When the note was last modified
}

export const NoteSchema = SchemaFactory.createForClass(Note);

// Add indexes for performance
NoteSchema.index({ userId: 1, isPinned: -1, createdAt: -1 });
NoteSchema.index({ userId: 1, tags: 1 });
NoteSchema.index({ userId: 1, context: 1 });
