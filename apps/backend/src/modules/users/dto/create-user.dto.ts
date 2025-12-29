import { IsEmail,   IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
     @IsString()
     @IsNotEmpty()
     @MaxLength(50)
     firstName!: string;

     @IsString()
     @IsNotEmpty()
     @MaxLength(50)
     lastName!: string;

     @IsEmail()
     @IsNotEmpty()
     @MaxLength(50)
     email!: string;

     @IsString()
     @MinLength(8)
     @MaxLength(50)
     password!: string;
}