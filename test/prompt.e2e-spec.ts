import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prompt } from '../src/schemas/prompt.schema';
import { User } from '../src/schemas/user.schema';
import * as bcrypt from 'bcrypt';

describe('Prompt Management (e2e)', () => {
  let app: INestApplication;
  let promptModel: Model<Prompt>;
  let userModel: Model<User>;
  let jwtService: JwtService;
  let accessToken: string;
  let testUser: any;
  let testPrompt: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    promptModel = moduleFixture.get<Model<Prompt>>(getModelToken(Prompt.name));
    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Create a test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await userModel.create({
      userId: 'test-user-e2e',
      username: 'test-user-e2e',
      email: 'test-e2e@example.com',
      password: hashedPassword,
    });

    // Generate JWT
    accessToken = jwtService.sign({
      userId: testUser.userId,
      username: testUser.username,
    });
  });

  afterAll(async () => {
    // Clean up - remove test user and all prompts
    await promptModel.deleteMany({ userId: testUser.userId }).exec();
    await userModel.deleteOne({ userId: testUser.userId }).exec();

    await app.close();
  });

  describe('POST /prompts', () => {
    it('should create a new prompt', async () => {
      const createPromptDto = {
        title: 'E2E Test Prompt',
        content: 'This is a test prompt for E2E testing',
        tags: ['e2e', 'test'],
      };

      const response = await request(app.getHttpServer())
        .post('/prompts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createPromptDto)
        .expect(201);

      expect(response.body).toMatchObject({
        title: createPromptDto.title,
        content: createPromptDto.content,
        tags: createPromptDto.tags,
        userId: testUser.userId,
      });

      expect(response.body.promptId).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();

      testPrompt = response.body;
    });

    it('should return 401 if unauthorized', async () => {
      const createPromptDto = {
        title: 'Unauthorized Prompt',
        content: 'This should fail',
      };

      await request(app.getHttpServer())
        .post('/prompts')
        .send(createPromptDto)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const invalidPromptDto = {
        title: 'Missing Content',
        // content is required but missing
      };

      const response = await request(app.getHttpServer())
        .post('/prompts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidPromptDto)
        .expect(400);

      expect(response.body.message).toContain('content');
    });
  });

  describe('GET /prompts', () => {
    it('should return all prompts for the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/prompts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const prompt = response.body.find(
        (p) => p.promptId === testPrompt.promptId,
      );
      expect(prompt).toBeDefined();
      expect(prompt.title).toBe(testPrompt.title);
    });

    it('should return 401 if unauthorized', async () => {
      await request(app.getHttpServer()).get('/prompts').expect(401);
    });
  });

  describe('GET /prompts/:promptId', () => {
    it('should return a specific prompt by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/prompts/${testPrompt.promptId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        promptId: testPrompt.promptId,
        title: testPrompt.title,
        content: testPrompt.content,
        userId: testUser.userId,
      });
    });

    it('should return 404 if prompt not found', async () => {
      await request(app.getHttpServer())
        .get('/prompts/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PUT /prompts/:promptId', () => {
    it('should update an existing prompt', async () => {
      const updatePromptDto = {
        title: 'Updated E2E Test Prompt',
        content: 'This prompt has been updated',
        tags: ['e2e', 'test', 'updated'],
      };

      const response = await request(app.getHttpServer())
        .put(`/prompts/${testPrompt.promptId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updatePromptDto)
        .expect(200);

      expect(response.body).toMatchObject({
        promptId: testPrompt.promptId,
        title: updatePromptDto.title,
        content: updatePromptDto.content,
        tags: updatePromptDto.tags,
        userId: testUser.userId,
      });

      // Verify updatedAt has changed
      expect(response.body.updatedAt).not.toBe(testPrompt.updatedAt);

      // Update our testPrompt reference
      testPrompt = response.body;
    });

    it('should update only the provided fields', async () => {
      const partialUpdateDto = {
        title: 'Partially Updated Title',
      };

      const response = await request(app.getHttpServer())
        .put(`/prompts/${testPrompt.promptId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(partialUpdateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        promptId: testPrompt.promptId,
        title: partialUpdateDto.title,
        // These should remain unchanged
        content: testPrompt.content,
        tags: testPrompt.tags,
        userId: testUser.userId,
      });

      // Update our testPrompt reference
      testPrompt = response.body;
    });

    it('should return 404 if prompt not found', async () => {
      const updatePromptDto = {
        title: 'This Should Fail',
      };

      await request(app.getHttpServer())
        .put('/prompts/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updatePromptDto)
        .expect(404);
    });
  });

  describe('DELETE /prompts/:promptId', () => {
    it('should delete an existing prompt', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/prompts/${testPrompt.promptId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Prompt deleted successfully',
      });

      // Verify the prompt was actually deleted
      await request(app.getHttpServer())
        .get(`/prompts/${testPrompt.promptId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 404 if prompt not found', async () => {
      await request(app.getHttpServer())
        .delete('/prompts/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
