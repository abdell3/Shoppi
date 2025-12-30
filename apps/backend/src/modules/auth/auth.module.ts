import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

import { AuthService } from './auth.service';
import { UsersRepository } from '../users/users.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { env } from '../../config/env';

@Module({
    imports: [
        PassportModule, 
        JwtModule.register({
            secret: env.JWT_SECRET,
            signOptions: { expiresIn: '24h'}
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService, 
        UsersRepository,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard
    ],
    exports: [
        AuthService, 
        JwtModule,
        JwtAuthGuard,
        RolesGuard
    ], 
})

export class AuthModule {}
