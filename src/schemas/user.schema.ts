import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema()
export class User extends Document {
  @Prop({ required: true, unique: true })
  userId: string; // Unique user ID generated upon registration

  @Prop({ required: false, unique: true })
  username: string; // Username chosen by the user, must be unique

  @Prop({ required: true, unique: true })
  email: string; // User's email, also unique to prevent duplicate accounts

  @Prop({ required: true })
  passwordHash: string; // Hashed password for secure storage

  @Prop({ default: Date.now })
  createdAt: Date; // Timestamp for when the user was created

  @Prop({ required: false })
  firstName: string; // User first name

  @Prop({ required: false })
  lastName: string; // User last name
}

export const UserSchema = SchemaFactory.createForClass(User);

// Middleware to generate a unique user ID on registration
UserSchema.pre<User>('save', function (next) {
  if (!this.userId) {
    this.userId = uuidv4(); // Generate UUID for new users if not already set
  }
  next();
});
