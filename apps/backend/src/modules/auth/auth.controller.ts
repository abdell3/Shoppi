import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
 import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

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


    @Post('register')
    async register(@Body() createUserDto: CreateUserDto) {
        return this.authService.register(createUserDto);
    }

    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        const accessToken = await this.authService.login(loginDto);
        return { accessToken };
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get('my-profile')
    async getProfile(@Req() req: AuthenticatedRequest) {
        return req.user;
    }
}