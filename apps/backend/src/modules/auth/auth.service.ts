import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload.type';

import { UsersRepository } from '../users/users.repository';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { hashPassword } from '../../common/utils/password.util';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersRepository: UsersRepository,
        private readonly jwtService: JwtService
    ) {}

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

    async login(loginDto: LoginDto) {
        const user = await this.usersRepository.findByEmail(loginDto.email);

        if(!user) {
            throw new UnauthorizedException('Invalid credentials !');
        }

        const passwordValid = await bcrypt.compare(
            loginDto.password,
            user.password
        );

        if(!passwordValid) {
            throw new UnauthorizedException('Invalid credentials !');
        }

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role
        };

        const accessToken = await this.jwtService.signAsync(payload);

        return accessToken;

    }
}