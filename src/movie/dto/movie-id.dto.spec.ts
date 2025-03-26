import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MovieIdDto } from './movie-id.dto';

describe('MovieIdDto', () => {
  it('should accept a valid movie ID', async () => {
    // Valid input
    const dto = plainToInstance(MovieIdDto, { id: '123' });

    // Validate
    const errors = await validate(dto);

    // Expect no validation errors
    expect(errors.length).toBe(0);

    // Check transformation
    expect(dto.id).toBe(123);
    expect(typeof dto.id).toBe('number');
  });

  it('should validate that id is required', async () => {
    // Invalid input: missing id
    const dto = plainToInstance(MovieIdDto, {});

    // Validate
    const errors = await validate(dto);

    // Expect validation error
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('id');
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('should validate that id is a number', async () => {
    // Invalid input: non-numeric id
    const dto = plainToInstance(MovieIdDto, { id: 'abc' });

    // Validate
    const errors = await validate(dto);

    // Expect validation error
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('id');
    expect(errors[0].constraints).toHaveProperty('isNumber');
  });
});
