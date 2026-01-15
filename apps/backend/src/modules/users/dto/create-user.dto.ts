import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
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
}