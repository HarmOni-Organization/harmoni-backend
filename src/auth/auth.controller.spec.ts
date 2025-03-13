import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from '../dto';
import { AUTH_ERROR_MESSAGES } from './auth.types';
import { UnauthorizedException, HttpException } from '@nestjs/common';
import { Response, Request } from 'express';

describe('AuthController', () => {
  let controller: AuthController;

  const mockUser = {
    userId: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    createdAt: new Date(),
  };

  const mockAuthResponse = {
    accessToken: 'mock.access.token',
    refreshToken: 'mock.refresh.token',
    user: mockUser,
  };

  const mockAuthService = {
    registerUser: jest.fn(),
    login: jest.fn(),
    validateUser: jest.fn(),
    invalidateToken: jest.fn(),
    getUserFromToken: jest.fn(),
    refreshAccessToken: jest.fn(),
    isUsernameUnique: jest.fn(),
    isEmailUnique: jest.fn(),
  };

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  const mockRequest = {
    headers: {},
    body: {},
    params: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test123!',
    };

    it('should successfully register a new user', async () => {
      mockAuthService.registerUser.mockResolvedValue(mockAuthResponse);
      mockRequest.body = registerDto;

      await controller.register(
        registerDto,
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockAuthResponse);
      expect(mockAuthService.registerUser).toHaveBeenCalledWith(registerDto);
    });

    it('should handle registration errors', async () => {
      mockAuthService.registerUser.mockRejectedValue(
        new HttpException(AUTH_ERROR_MESSAGES.EMAIL_EXISTS, 409),
      );
      mockRequest.body = registerDto;

      await controller.register(
        registerDto,
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: AUTH_ERROR_MESSAGES.EMAIL_EXISTS,
      });
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      emailOrUsername: 'test@example.com',
      password: 'Test123!',
    };

    it('should successfully login user', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockUser);
      mockAuthService.login.mockReturnValue(mockAuthResponse);
      mockRequest.body = loginDto;

      await controller.login(loginDto, mockResponse as unknown as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockAuthResponse);
      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        loginDto.emailOrUsername,
        loginDto.password,
      );
      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
    });

    it('should handle login errors', async () => {
      mockAuthService.validateUser.mockRejectedValue(
        new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS),
      );
      mockRequest.body = loginDto;

      await controller.login(loginDto, mockResponse as unknown as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
      });
    });
  });

  describe('logout', () => {
    const mockToken = 'mock.jwt.token';

    it('should successfully logout user', async () => {
      mockRequest.headers = { authorization: `Bearer ${mockToken}` };

      await controller.logout(
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Logged out successfully',
      });
      expect(mockAuthService.invalidateToken).toHaveBeenCalledWith(mockToken);
    });

    it('should handle logout errors', async () => {
      mockAuthService.invalidateToken.mockRejectedValue(
        new UnauthorizedException(AUTH_ERROR_MESSAGES.TOKEN_INVALID),
      );
      mockRequest.headers = { authorization: `Bearer ${mockToken}` };

      await controller.logout(
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: AUTH_ERROR_MESSAGES.TOKEN_INVALID,
      });
    });
  });

  describe('verifyToken', () => {
    const mockToken = 'mock.jwt.token';

    it('should successfully verify token', async () => {
      mockAuthService.getUserFromToken.mockResolvedValue(mockUser);
      mockRequest.headers = { authorization: `Bearer ${mockToken}` };

      await controller.verifyToken(
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        user: {
          userId: mockUser.userId,
          username: mockUser.username,
          email: mockUser.email,
          createdAt: mockUser.createdAt,
        },
      });
      expect(mockAuthService.getUserFromToken).toHaveBeenCalledWith(mockToken);
    });

    it('should handle invalid token', async () => {
      mockAuthService.getUserFromToken.mockRejectedValue(
        new UnauthorizedException(AUTH_ERROR_MESSAGES.TOKEN_INVALID),
      );
      mockRequest.headers = { authorization: `Bearer ${mockToken}` };

      await controller.verifyToken(
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: AUTH_ERROR_MESSAGES.TOKEN_INVALID,
      });
    });
  });

  describe('refreshToken', () => {
    const mockToken = 'mock.refresh.token';

    it('should successfully refresh access token', async () => {
      mockAuthService.refreshAccessToken.mockResolvedValue('new.access.token');
      mockRequest.headers = { authorization: `Bearer ${mockToken}` };

      await controller.refreshToken(
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        accessToken: 'new.access.token',
      });
      expect(mockAuthService.refreshAccessToken).toHaveBeenCalledWith(
        mockToken,
      );
    });

    it('should handle refresh token errors', async () => {
      mockAuthService.refreshAccessToken.mockRejectedValue(
        new UnauthorizedException(AUTH_ERROR_MESSAGES.TOKEN_INVALID),
      );
      mockRequest.headers = { authorization: `Bearer ${mockToken}` };

      await controller.refreshToken(
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: AUTH_ERROR_MESSAGES.TOKEN_INVALID,
      });
    });
  });

  describe('checkUsername', () => {
    it('should check username availability', async () => {
      mockAuthService.isUsernameUnique.mockResolvedValue(true);
      mockRequest.params = { username: 'testuser' };

      await controller.checkUsername(
        'testuser',
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ isUnique: true });
      expect(mockAuthService.isUsernameUnique).toHaveBeenCalledWith('testuser');
    });
  });

  describe('checkEmail', () => {
    it('should check email availability', async () => {
      mockAuthService.isEmailUnique.mockResolvedValue(true);
      mockRequest.params = { email: 'test@example.com' };

      await controller.checkEmail(
        'test@example.com',
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ isUnique: true });
      expect(mockAuthService.isEmailUnique).toHaveBeenCalledWith(
        'test@example.com',
      );
    });
  });
});
