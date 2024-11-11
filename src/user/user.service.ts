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
    try {
      const newUser = new this.userModel({
        ...userData,
        passwordHash: userData.password,
      });
  
      // Set userId as the MongoDB _id for convenience
      newUser.userId = `${newUser._id}`;
  
      // Attempt to save the new user
      return await newUser.save();
    } catch (error) {
      console.error("User Creation Error:", error.message, { details: error });
      throw new HttpException(
        'Failed to create user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  

  async findOneById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }
}
