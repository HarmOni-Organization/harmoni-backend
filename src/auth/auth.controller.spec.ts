import * as request from 'supertest';
import { HttpStatus } from '@nestjs/common';

describe('AuthController - POST /auth/login', () => {
  it('should return a token for valid credentials', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'test@example.com',
      password: 'securePassword',
    });
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.accessToken).toBeDefined();
  });

  it('should return 401 for invalid credentials', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'wrong@example.com',
      password: 'wrongPassword',
    });
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('should return 429 for excessive requests', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).post('/auth/login').send({
        email: 'test@example.com',
        password: 'wrongPassword',
      });
    }
    const res = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'test@example.com',
      password: 'wrongPassword',
    });
    expect(res.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });
});
