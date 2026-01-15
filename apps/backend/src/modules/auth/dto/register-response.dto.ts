import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName!: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName!: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'User role',
    example: 'CLIENT',
    enum: ['CLIENT', 'ADMIN', 'MANAGER'],
  })
  role!: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+33612345678',
    nullable: true,
    required: false,
  })
  phone?: string | null;

  @ApiProperty({
    description: 'User address',
    example: '123 Main Street, Paris',
    nullable: true,
    required: false,
  })
  address?: string | null;
}
