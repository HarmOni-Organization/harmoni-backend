import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { UUID } from 'crypto';
import { Document } from 'mongoose';

// Create a User document interface
export type UserDocument = User & Document;

// Define the User schema
@Schema()
export class User {
  @Prop({ required: true })
  userId: UUID
  
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  age?: number; // Optional
}

// Create a Mongoose schema factory
export const UserSchema = SchemaFactory.createForClass(User);