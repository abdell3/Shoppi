import { Body, Controller, Get, HttpCode, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RejectRolePipe } from './pipes/reject-role.pipe';
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

    @ApiOperation({ summary: 'Créer un compte client' })
    @ApiResponse({ 
        status: 201, 
        description: 'User créé avec succès',
        type: RegisterResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
    @ApiResponse({ status: 403, description: 'Role assignment is not allowed via registration' })
    @ApiBody({ type: CreateUserDto })
    @UsePipes(
        RejectRolePipe,
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        })
    )
    @Post('register')
    async register(@Body() createUserDto: CreateUserDto) {
        return this.authService.register(createUserDto);
    }



    @ApiOperation({ summary: 'Authentification et obtention du token JWT' })
    @ApiResponse({ 
        status: 200, 
        description: 'Token JWT retourné avec succès',
        type: LoginResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Identifiants invalides' })
    @ApiBody({ type: LoginDto })
    @HttpCode(200)
    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        const accessToken = await this.authService.login(loginDto);
        return { accessToken };
    }



    @ApiBearerAuth()
    @ApiOperation({ summary: 'Récupérer le profil de l\'utilisateur connecté' })
    @ApiResponse({ 
        status: 200, 
        description: 'Profil utilisateur récupéré avec succès',
        type: ProfileResponseDto,
    })
    @ApiResponse({ status: 401, description: 'Non authentifié' })
    @UseGuards(JwtAuthGuard)
    @Get('my-profile')
    async getProfile(@Req() req: AuthenticatedRequest) {
        return req.user;
    }
}