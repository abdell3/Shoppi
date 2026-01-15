import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { parseJwtExpiresIn } from '../../common/utils/jwt-expiration.util';
 
import { AuthService } from './auth.service';
import { UsersRepository } from '../users/users.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller';

@Module({
    imports: [
        ConfigModule,
        PassportModule, 
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const secret = config.get<string>('JWT_SECRET');
                if (!secret) {
                    throw new Error('JWT_SECRET is not defined');
                }
                return {
                    secret,
                    signOptions: {
                        expiresIn: parseJwtExpiresIn(
                            config.get<string>('JWT_EXPIRES_IN'),
                        ),
                    },
                };
            },
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