import { Injectable, ConflictException } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { hashPassword } from '../../common/utils/password.util';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
    constructor(private readonly usersRepository: UsersRepository) {}

    async register(createUserDto: CreateUserDto) {
        const existingUser = await this.usersRepository.findByEmail(
            createUserDto.email
        );

        if(existingUser) {
            throw new ConflictException('Email already exist/in use !');
        }
        
        const hashedPassword = await hashPassword(createUserDto.password);
        const user = await this.usersRepository.create({
            ...createUserDto,
            password: hashedPassword,
            role: UserRole.CLIENT
        });

        const { password, ...result } = user;
        return result;
    }
}