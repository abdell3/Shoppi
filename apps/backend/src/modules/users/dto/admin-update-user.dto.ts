import { IsString, IsEmail, MinLength, MaxLength, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class AdminUpdateUserDto {
  @ApiPropertyOptional({
    description: 'First name of the user',
    example: 'John',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name of the user',
    example: 'Doe',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
    maxLength: 50,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(50)
  email?: string;

  @ApiPropertyOptional({
    description: 'User password (minimum 8 characters, maximum 50 characters)',
    example: 'SecurePassword123!',
    minLength: 8,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+33612345678',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @ApiPropertyOptional({
    description: 'Address',
    example: '123 Main Street, Paris',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @ApiPropertyOptional({
    description: 'User role (ADMIN or CLIENT)',
    example: 'CLIENT',
    enum: ['ADMIN', 'CLIENT', 'MANAGER'],
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'User active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
