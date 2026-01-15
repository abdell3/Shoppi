import { ApiProperty } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId!: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'User role',
    example: 'CLIENT',
    enum: ['CLIENT', 'ADMIN', 'MANAGER'],
  })
  role!: string;
}
