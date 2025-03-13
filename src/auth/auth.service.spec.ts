import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { UnauthorizedException, HttpException } from '@nestjs/common';
import { AUTH_ERROR_MESSAGES } from './auth.types';
import { RegisterDto } from '../dto';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  // Test data setup
  const mockUser = {
    userId: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    createdAt: new Date(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
    verifyAsync: jest.fn().mockResolvedValue({ userId: mockUser.userId }),
  };

  const mockUserService = {
    findOneByEmail: jest.fn(),
    findOneByUsername: jest.fn(),
    findByEmailOrUsername: jest.fn(),
    findOneById: jest.fn(),
    createUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    // Reset mock calls before each test
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be properly initialized', () => {
      expect(service).toBeDefined();
    });
  });

  describe('User Registration', () => {
    const registerDto: RegisterDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test123!',
    };

    describe('successful registration', () => {
      it('should create a new user and return tokens with user data', async () => {
        mockUserService.findOneByEmail.mockResolvedValue(null);
        mockUserService.createUser.mockResolvedValue(mockUser);

        const result = await service.registerUser(registerDto);

        // Verify response structure
        expect(result).toEqual({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          user: {
            userId: mockUser.userId,
            username: mockUser.username,
            email: mockUser.email,
            createdAt: mockUser.createdAt,
          },
        });

        // Verify service calls
        expect(mockUserService.findOneByEmail).toHaveBeenCalledWith(
          registerDto.email,
        );
        expect(mockUserService.createUser).toHaveBeenCalled();
        expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
      });
    });

    describe('registration failures', () => {
      it('should throw error when email already exists', async () => {
        mockUserService.findOneByEmail.mockResolvedValue(mockUser);

        await expect(service.registerUser(registerDto)).rejects.toThrow(
          HttpException,
        );

        await expect(service.registerUser(registerDto)).rejects.toMatchObject({
          message: AUTH_ERROR_MESSAGES.EMAIL_EXISTS,
        });
      });
    });
  });

  describe('User Authentication', () => {
    describe('validateUser', () => {
      it('should successfully validate correct credentials', async () => {
        mockUserService.findByEmailOrUsername.mockResolvedValue(mockUser);
        jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

        const result = await service.validateUser(
          'test@example.com',
          'password',
        );

        expect(result).toEqual(mockUser);
        expect(mockUserService.findByEmailOrUsername).toHaveBeenCalledWith(
          'test@example.com',
        );
      });

      it('should reject invalid credentials', async () => {
        mockUserService.findByEmailOrUsername.mockResolvedValue(null);

        await expect(
          service.validateUser('wrong@example.com', 'password'),
        ).rejects.toThrow(UnauthorizedException);

        await expect(
          service.validateUser('wrong@example.com', 'password'),
        ).rejects.toMatchObject({
          message: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
        });
      });
    });

    describe('login', () => {
      it('should generate tokens and return user data', () => {
        const result = service.login(mockUser);

        expect(result).toEqual({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          user: {
            userId: mockUser.userId,
            username: mockUser.username,
            email: mockUser.email,
            createdAt: mockUser.createdAt,
          },
        });
        expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Token Management', () => {
    const mockToken = 'mock.jwt.token';

    describe('token invalidation', () => {
      it('should successfully invalidate a valid token', async () => {
        await service.invalidateToken(mockToken);
        const isValid = await service.isTokenValid(mockToken);
        expect(isValid).toBe(false);
      });

      it('should reject empty token', async () => {
        await expect(service.invalidateToken('')).rejects.toThrow(
          HttpException,
        );
      });
    });

    describe('token validation', () => {
      it('should confirm valid token', async () => {
        const isValid = await service.isTokenValid(mockToken);
        expect(isValid).toBe(true);
      });

      it('should reject invalidated token', async () => {
        await service.invalidateToken(mockToken);
        const isValid = await service.isTokenValid(mockToken);
        expect(isValid).toBe(false);
      });
    });

    describe('user data from token', () => {
      it('should return user data for valid token', async () => {
        mockUserService.findOneById.mockResolvedValue(mockUser);

        const result = await service.getUserFromToken(mockToken);

        expect(result).toEqual({
          userId: mockUser.userId,
          username: mockUser.username,
          email: mockUser.email,
          createdAt: mockUser.createdAt,
        });
      });

      it('should reject invalid token', async () => {
        mockJwtService.verifyAsync.mockRejectedValue(new Error());

        await expect(service.getUserFromToken(mockToken)).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });

    describe('token refresh', () => {
      it('should generate new access token from valid refresh token', async () => {
        // Setup mocks
        mockJwtService.verifyAsync.mockResolvedValue({
          userId: mockUser.userId,
        });
        mockUserService.findOneById.mockResolvedValue(mockUser);
        mockJwtService.sign.mockReturnValue('new.access.token');

        const result = await service.refreshAccessToken(mockToken);

        // Verify the result and service calls
        expect(result).toBe('new.access.token');
        expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(mockToken);
        expect(mockUserService.findOneById).toHaveBeenCalledWith(
          mockUser.userId,
        );
        expect(mockJwtService.sign).toHaveBeenCalled();
      });

      it('should reject invalid refresh token', async () => {
        mockJwtService.verifyAsync.mockRejectedValue(
          new Error('Invalid token'),
        );

        await expect(service.refreshAccessToken(mockToken)).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });
  });

  describe('Data Validation', () => {
    describe('username uniqueness', () => {
      it('should confirm unique username', async () => {
        mockUserService.findOneByUsername.mockResolvedValue(null);
        const result = await service.isUsernameUnique('uniqueuser');
        expect(result).toBe(true);
      });

      it('should reject existing username', async () => {
        mockUserService.findOneByUsername.mockResolvedValue(mockUser);
        const result = await service.isUsernameUnique('testuser');
        expect(result).toBe(false);
      });
    });

    describe('email uniqueness', () => {
      it('should confirm unique email', async () => {
        mockUserService.findOneByEmail.mockResolvedValue(null);
        const result = await service.isEmailUnique('unique@example.com');
        expect(result).toBe(true);
      });

      it('should reject existing email', async () => {
        mockUserService.findOneByEmail.mockResolvedValue(mockUser);
        const result = await service.isEmailUnique('test@example.com');
        expect(result).toBe(false);
      });
    });
  });
});
