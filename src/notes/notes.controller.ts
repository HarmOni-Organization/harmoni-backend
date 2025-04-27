import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { QueryNotesDto } from './dto/query-notes.dto';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  /**
   * Create a new note
   */
  @Post()
  create(@Req() req, @Body() createNoteDto: CreateNoteDto) {
    return this.notesService.create(req.user.userId, createNoteDto);
  }

  /**
   * Get all notes for the authenticated user
   */
  @Get()
  findAll(@Req() req, @Query() queryDto: QueryNotesDto) {
    return this.notesService.findAll(req.user.userId, queryDto);
  }

  /**
   * Get a specific note by ID
   */
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.notesService.findOne(req.user.userId, id);
  }

  /**
   * Update a note
   */
  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    return this.notesService.update(req.user.userId, id, updateNoteDto);
  }

  /**
   * Delete a note
   */
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.notesService.remove(req.user.userId, id);
  }

  /**
   * Get all tags for the authenticated user
   */
  @Get('tags/all')
  getTags(@Req() req) {
    return this.notesService.getAllTags(req.user.userId);
  }

  /**
   * Sync notes from client
   */
  @Post('sync')
  syncNotes(@Req() req, @Body() notes: any[]) {
    return this.notesService.syncNotes(req.user.userId, notes);
  }
}
