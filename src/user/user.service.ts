import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../schemas/user.schema';
import { RegisterDto } from '../dto';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  /**
   * Finds a user by their email.
   */
  async findOneByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  /**
   * Finds a user by their username.
   * @param username - The username to search for.
   * @returns User document or null if not found.
   */
  async findOneByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  /**
   * Creates a new user in the database.
   */
  async createUser(userData: RegisterDto): Promise<User> {
    try {
      const newUser = new this.userModel({
        ...userData,
        passwordHash: userData.password,
      });
      newUser.userId = `${newUser._id}`;
      return await newUser.save();
    } catch (error) {
      console.error("User Creation Error:", error.message, { details: error });
      throw new HttpException('Failed to create user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

    /**
   * Finds a user by email or username.
   * @param emailOrUsername - The email or username to search for.
   * @returns User document or null if not found.
   */
    async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
      return this.userModel
        .findOne({
          $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
        })
        .exec();
    }

  async findOneById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }
}
