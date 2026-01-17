import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserEntity } from './entities/user.entity';
import { hashPassword } from '../../common/utils/password.util';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findMe(userId: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return UserEntity.fromPersistence(user);
  }

  async updateMe(userId: string, updateProfileDto: UpdateProfileDto): Promise<UserEntity> {
    const existingUser = await this.usersRepository.findById(userId);

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (updateProfileDto.email && updateProfileDto.email !== existingUser.email) {
      const emailExists = await this.usersRepository.findByEmail(updateProfileDto.email);

      if (emailExists) {
        throw new ConflictException(`User with email '${updateProfileDto.email}' already exists`);
      }
    }

    const updateData: {
      email?: string;
      password?: string;
    } = {};

    if (updateProfileDto.email !== undefined) {
      updateData.email = updateProfileDto.email;
    }
    if (updateProfileDto.password !== undefined) {
      updateData.password = await hashPassword(updateProfileDto.password);
    }

    const updatedUser = await this.usersRepository.update(userId, updateData);
    return UserEntity.fromPersistence(updatedUser);
  }
}
