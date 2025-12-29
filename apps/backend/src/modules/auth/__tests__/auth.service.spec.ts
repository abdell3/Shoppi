import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { UsersRepository } from '../../users/users.repository';
import { ConflictException } from '@nestjs/common';
import { hashPassword } from '../../../common/utils/password.util';

jest.mock('../../../common/utils/password.util');

describe('AuthService - Register', () => {
    let authService: AuthService;
    let usersRepository: jest.Mocked<UsersRepository>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UsersRepository,
                    useValue: {
                        findByEmail: jest.fn(),
                        create: jest.fn(),
                    },
                },
            ],
        }).compile();

        authService = module.get<AuthService>(AuthService);
        usersRepository = module.get(UsersRepository);
    })

    it('should register a new user successfully', async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    (hashPassword as jest.Mock).mockResolvedValue('hashed-password');

    usersRepository.create.mockResolvedValue({
      id: 'uuid',
      email: 'test@test.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'hashed-password',
      role: 'CLIENT',
    } as any);

    const result = await authService.register({
      email: 'test@test.com',
      password: '12345678',
      firstName: 'John',
      lastName: 'Doe',
    });

    expect(usersRepository.findByEmail).toHaveBeenCalled();
    expect(hashPassword).toHaveBeenCalled();
    expect(usersRepository.create).toHaveBeenCalled();
    expect(result).not.toHaveProperty('password');
  });

  it('should throw if email already exists', async () => {
    usersRepository.findByEmail.mockResolvedValue({ id: 'uuid' } as any);

    await expect(
      authService.register({
        email: 'test@test.com',
        password: '12345678',
        firstName: 'John',
        lastName: 'Doe',
      }),
    ).rejects.toThrow(ConflictException); 
  });
});