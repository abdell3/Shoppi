import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { UsersRepository } from '../users/users.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { env } from '../../config/env';

@Module({
    imports: [
        PassportModule, 
        JwtModule.register({
            secret: env.JWT_SECRET,
            signOptions: { expiresIn: '24h'}
        }),
    ],
    providers: [
        AuthService, 
        UsersRepository,
        JwtStrategy
    ],
    exports: [
        AuthService, 
        JwtModule
    ], 
})

export class AuthModule {}
