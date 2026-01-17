import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Email address',
    example: 'user@example.com',
    maxLength: 50,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(50)
  email?: string;

  @ApiPropertyOptional({
    description: 'Password (minimum 8 characters, maximum 50 characters)',
    example: 'NewSecurePassword123!',
    minLength: 8,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password?: string;
}
