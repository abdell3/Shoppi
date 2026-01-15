import { Body, Controller, Get, HttpCode, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RejectRolePipe } from './pipes/reject-role.pipe';

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

    @ApiOperation({ summary: 'Créer un compte utilisateur (CLIENT uniquement)' })
    @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès' })
    @ApiResponse({ status: 400, description: 'Erreur de validation' })
    @ApiResponse({ status: 403, description: 'Assignment de rôle non autorisé via l\'enregistrement' })
    @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
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
        schema: {
            type: 'object',
            properties: {
                accessToken: {
                    type: 'string',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Erreur de validation' })
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
        description: 'Profil utilisateur retourné',
        schema: {
            type: 'object',
            properties: {
                userId: {
                    type: 'string',
                    example: '123e4567-e89b-12d3-a456-426614174000'
                },
                email: {
                    type: 'string',
                    example: 'user@example.com'
                },
                role: {
                    type: 'string',
                    example: 'CLIENT'
                }
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Non authentifié - Token manquant ou invalide' })
    @UseGuards(JwtAuthGuard)
    @Get('my-profile')
    async getProfile(@Req() req: AuthenticatedRequest) {
        return req.user;
    }
}