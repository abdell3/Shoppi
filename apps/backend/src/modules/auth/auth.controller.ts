import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
 import { ApiBearerAuth, ApiTags, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';

 interface AuthenticatedRequest extends Request {
    user: {
        userId: string,
        email: string,
        role: string
    }
 }

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @ApiOperation({ summary: 'Créer un compte'})
    @ApiResponse({ status: 201, description: 'User crée avec succès!'})
    @ApiResponse({ status: 409, description: 'Email déjà utilisé !'})
    @ApiBody({ type: CreateUserDto})
    @Post('register')
    async register(@Body() createUserDto: CreateUserDto) {
        return this.authService.register(createUserDto);
    }



    @ApiOperation({ summary: 'Authentification : '})
    @ApiResponse({ status: 200, description: 'JWT retourné ! '})
    @ApiResponse({ status: 401, description: 'Identifiants invalides !'})
    @ApiBody({ type: LoginDto})
    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        const accessToken = await this.authService.login(loginDto);
        return { accessToken };
    }



    @ApiBearerAuth()
    @ApiOperation({ summary: 'Récupérer le profil user connecté : '})
    @ApiResponse({ status: 200, description: 'User profil ! '})
    @ApiResponse({ status: 401, description: 'Non authentifié !'})
    @UseGuards(JwtAuthGuard)
    @Get('my-profile')
    async getProfile(@Req() req: AuthenticatedRequest) {
        return req.user;
    }
}