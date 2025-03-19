import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MemberRole, RoomStatus, RoomType } from 'src/constants';

@Schema()
export class RoomInfo {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  ownerId: string;

  @Prop({ required: true, default: false })
  isPrivate: boolean;

  @Prop({ required: true, enum: Object.values(RoomStatus) })
  status: RoomStatus;

  @Prop({ required: true, default: Date.now })
  createdAt: number;

  @Prop({ required: true, default: Date.now })
  lastActivity: number;

  @Prop({
    required: true,
    enum: Object.values(RoomType),
    default: RoomType.WATCH_TOGETHER,
  })
  roomType: RoomType;
}

@Schema()
export class SyncState {
  @Prop({ required: true, default: 0 })
  time: number;

  @Prop({ required: true, default: false })
  isPlaying: boolean;

  @Prop({ required: true, default: Date.now })
  lastUpdated: number;

  @Prop({ required: true, default: 500 })
  syncErrorMargin: number;
}

@Schema()
export class RoomMember {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  clientId: string;

  @Prop({ required: true, default: true })
  active: boolean;

  @Prop({ required: true, enum: Object.values(MemberRole) })
  role: MemberRole;

  @Prop({ required: true, default: false })
  typing: boolean;

  @Prop({ required: true, default: Date.now })
  lastActivity: number;
}

@Schema()
export class FileInfo {
  @Prop({ required: true })
  fileId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, default: 0 })
  fullTime: number;

  @Prop({ required: true })
  hash: string;
}

@Schema()
export class ChatMessage {
  @Prop({ required: true })
  messageId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  timestamp: string;

  @Prop()
  systemMessage?: boolean;

  @Prop()
  replyTo?: string;

  @Prop()
  edited?: boolean;

  @Prop()
  deleted?: boolean;
}

@Schema()
export class Room extends Document {
  @Prop({ required: true, unique: true })
  roomId: string;

  @Prop({ type: RoomInfo, required: true })
  roomInfo: RoomInfo;

  @Prop({ type: SyncState, required: true })
  syncState: SyncState;

  @Prop({ type: [RoomMember], required: true, default: [] })
  members: RoomMember[];

  @Prop({ type: [FileInfo], required: true, default: [] })
  files: FileInfo[];

  @Prop({ type: [ChatMessage], required: true, default: [] })
  chat: ChatMessage[];
}

export const RoomSchema = SchemaFactory.createForClass(Room);
