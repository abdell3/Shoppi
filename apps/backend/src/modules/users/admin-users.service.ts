import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersRepository } from './users.repository';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UserEntity } from './entities/user.entity';
import { hashPassword } from '../../common/utils/password.util';

@Injectable()
export class AdminUsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: AdminCreateUserDto): Promise<UserEntity> {
    const existingUser = await this.usersRepository.findByEmail(createUserDto.email);

    if (existingUser) {
      throw new ConflictException(`User with email '${createUserDto.email}' already exists`);
    }

    const hashedPassword = await hashPassword(createUserDto.password);

    const user = await this.usersRepository.create({
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: createUserDto.email,
      password: hashedPassword,
      phone: createUserDto.phone || null,
      address: createUserDto.address || null,
      role: createUserDto.role,
      isActive: true,
    });

    return UserEntity.fromPersistence(user);
  }

  async findAll(): Promise<UserEntity[]> {
    const users = await this.usersRepository.findAll();
    return UserEntity.fromPersistenceArray(users);
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return UserEntity.fromPersistence(user);
  }

  async update(id: string, updateUserDto: AdminUpdateUserDto, currentUserId: string): Promise<UserEntity> {
    const existingUser = await this.usersRepository.findById(id);

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.usersRepository.findByEmail(updateUserDto.email);

      if (emailExists) {
        throw new ConflictException(`User with email '${updateUserDto.email}' already exists`);
      }
    }

    const updateData: {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
      phone?: string | null;
      address?: string | null;
      role?: UserRole;
      isActive?: boolean;
    } = {};

    if (updateUserDto.firstName !== undefined) {
      updateData.firstName = updateUserDto.firstName;
    }
    if (updateUserDto.lastName !== undefined) {
      updateData.lastName = updateUserDto.lastName;
    }
    if (updateUserDto.email !== undefined) {
      updateData.email = updateUserDto.email;
    }
    if (updateUserDto.password !== undefined) {
      updateData.password = await hashPassword(updateUserDto.password);
    }
    if (updateUserDto.phone !== undefined) {
      updateData.phone = updateUserDto.phone;
    }
    if (updateUserDto.address !== undefined) {
      updateData.address = updateUserDto.address;
    }
    if (updateUserDto.role !== undefined) {
      updateData.role = updateUserDto.role;
    }
    if (updateUserDto.isActive !== undefined) {
      updateData.isActive = updateUserDto.isActive;
    }

    const updatedUser = await this.usersRepository.update(id, updateData);
    return UserEntity.fromPersistence(updatedUser);
  }

  async remove(id: string, currentUserId: string): Promise<UserEntity> {
    if (id === currentUserId) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    const existingUser = await this.usersRepository.findById(id);

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const softDeletedUser = await this.usersRepository.softDelete(id);
    return UserEntity.fromPersistence(softDeletedUser);
  }
}
