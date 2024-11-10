import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../schemas/user.schema';
import { RegisterDto } from '../dto';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async createUser(userData: RegisterDto): Promise<User> {
    // Ensure the password is hashed before assigning to passwordHash
    const hashedPassword = userData.password
  
    console.log('User Data Before Save:', {
      ...userData,
      passwordHash: hashedPassword,
    });
  
    // Create the new user with hashed password and other fields
    const newUser = new this.userModel({
      ...userData,
      passwordHash: hashedPassword,
    });
  
    // Assign userId based on the MongoDB-generated _id
    newUser.userId = `${newUser._id}`;
  
    try {
      console.log("Attempting to save newUser:", newUser);
      const savedUser = await newUser.save();
      console.log("User created successfully:", savedUser);
      return savedUser;
    } catch (error) {
      console.error("Error while saving newUser:", error);
      throw new HttpException(
        'Error creating user: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOneById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }
}
