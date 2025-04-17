import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Note, NoteDocument } from '../schemas/note.schema';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { QueryNotesDto } from './dto/query-notes.dto';

@Injectable()
export class NotesService {
  constructor(@InjectModel(Note.name) private noteModel: Model<NoteDocument>) {}

  /**
   * Create a new note for a user
   */
  async create(userId: string, createNoteDto: CreateNoteDto): Promise<Note> {
    const userObjectId = new Types.ObjectId(userId);
    const createdNote = new this.noteModel({
      userId: userObjectId,
      ...createNoteDto,
      lastModified: new Date(),
      lastSyncedAt: new Date(),
    });
    return createdNote.save();
  }

  /**
   * Find all notes belonging to a user with optional filtering
   */
  async findAll(
    userId: string,
    queryDto: QueryNotesDto,
  ): Promise<{ notes: Note[]; total: number }> {
    const { search, tags, context, isPinned, limit, offset } = queryDto;
    const userObjectId = new Types.ObjectId(userId);

    // Build query filters
    const filter: any = { userId: userObjectId };

    if (search) {
      filter.content = { $regex: search, $options: 'i' };
    }

    if (tags && tags.length > 0) {
      filter.tags = { $in: tags };
    }

    if (context) {
      filter.context = context;
    }

    if (isPinned !== undefined) {
      filter.isPinned = isPinned;
    }

    // Get total count for pagination
    const total = await this.noteModel.countDocuments(filter);

    // Execute query with pagination
    const notes = await this.noteModel
      .find(filter)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();

    return {
      notes,
      total,
    };
  }

  /**
   * Find a specific note by ID
   */
  async findOne(userId: string, id: string): Promise<Note> {
    const userObjectId = new Types.ObjectId(userId);
    const note = await this.noteModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: userObjectId,
      })
      .exec();

    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    return note;
  }

  /**
   * Update a note
   */
  async update(
    userId: string,
    id: string,
    updateNoteDto: UpdateNoteDto,
  ): Promise<Note> {
    const userObjectId = new Types.ObjectId(userId);
    const updatedNote = await this.noteModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: userObjectId },
        {
          ...updateNoteDto,
          lastModified: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!updatedNote) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    return updatedNote;
  }

  /**
   * Delete a note
   */
  async remove(userId: string, id: string): Promise<{ deleted: boolean }> {
    const userObjectId = new Types.ObjectId(userId);
    const result = await this.noteModel
      .deleteOne({
        _id: new Types.ObjectId(id),
        userId: userObjectId,
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    return { deleted: true };
  }

  /**
   * Get all unique tags for a user
   */
  async getAllTags(userId: string): Promise<string[]> {
    const userObjectId = new Types.ObjectId(userId);
    const result = await this.noteModel
      .aggregate([
        { $match: { userId: userObjectId } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags' } },
        { $project: { _id: 0, tag: '$_id' } },
      ])
      .exec();

    return result.map((item) => item.tag);
  }

  /**
   * Handle sync from offline client
   */
  async syncNotes(userId: string, clientNotes: any[]): Promise<any> {
    const userObjectId = new Types.ObjectId(userId);
    const results = {
      updated: [],
      created: [],
      conflicts: [],
    };

    for (const clientNote of clientNotes) {
      try {
        if (clientNote._id) {
          // Try to find existing note
          const existingNote = await this.noteModel.findOne({
            _id: new Types.ObjectId(clientNote._id),
            userId: userObjectId,
          });

          if (existingNote) {
            // Resolve conflicts using lastModified timestamp
            const clientLastModified = new Date(clientNote.lastModified);
            const serverLastModified = existingNote.lastModified;

            if (clientLastModified > serverLastModified) {
              // Client changes are newer, update server
              const { _id, userId, ...updateData } = clientNote;
              const updated = await this.update(userId, _id, updateData);
              results.updated.push(updated);
            } else if (clientLastModified < serverLastModified) {
              // Server changes are newer, inform client
              results.conflicts.push({
                clientNote,
                serverNote: existingNote,
              });
            }
            // If equal timestamps, no change needed
          } else {
            // Note with this ID doesn't exist, create it as new
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _id, ...createData } = clientNote;
            const created = await this.create(userId, createData);
            results.created.push(created);
          }
        } else {
          // New note without ID, create it
          const created = await this.create(userId, clientNote);
          results.created.push(created);
        }
      } catch (error) {
        console.error('Error syncing note:', error);
        results.conflicts.push({
          clientNote,
          error: error.message,
        });
      }
    }

    return results;
  }
}
