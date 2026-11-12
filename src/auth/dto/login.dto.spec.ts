import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserRole } from '@prisma/client';
import { CreateUserDto } from '../../users/dto/create-user.dto.js';
import { LoginDto } from './login.dto.js';

describe('LoginDto', () => {
  it('accepts the configured nine-character admin password', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'admin@example.com',
      password: 'aryan@123',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects passwords shorter than eight characters', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'admin@example.com',
      password: 'short7!',
    });

    const errors = await validate(dto);

    expect(errors.map(({ property }) => property)).toContain('password');
  });

  it('uses the same minimum for newly created accounts', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'teacher@example.com',
      fullName: 'Sample Teacher',
      password: 'aryan@123',
      role: UserRole.TEACHER,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
