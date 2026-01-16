import { IsString, IsNotEmpty, IsEmail, MinLength, MaxLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class AdminCreateUserDto {
  @ApiProperty({
    description: 'First name of the user',
    example: 'John',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName!: string;

  @ApiProperty({
    description: 'Last name of the user',
    example: 'Doe',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName!: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
    maxLength: 50,
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(50)
  email!: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters, maximum 50 characters)',
    example: 'SecurePassword123!',
    minLength: 8,
    maxLength: 50,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password!: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+33612345678',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Address',
    example: '123 Main Street, Paris',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiProperty({
    description: 'User role (ADMIN or CLIENT)',
    example: 'CLIENT',
    enum: ['ADMIN', 'CLIENT', 'MANAGER'],
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role!: UserRole;
}
