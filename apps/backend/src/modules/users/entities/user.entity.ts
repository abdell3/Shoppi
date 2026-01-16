import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

type UserPersistence = {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
};

export class UserEntity {
  @ApiProperty({
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  public readonly id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  public readonly email: string;

  @ApiProperty({
    description: 'User role',
    example: 'CLIENT',
    enum: ['CLIENT', 'ADMIN', 'MANAGER'],
  })
  public readonly role: UserRole;

  @ApiProperty({
    description: 'User active status',
    example: true,
  })
  public readonly isActive: boolean;

  @ApiProperty({
    description: 'User creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  public readonly createdAt: Date;

  private constructor(
    id: string,
    email: string,
    role: UserRole,
    isActive: boolean,
    createdAt: Date,
  ) {
    this.id = id;
    this.email = email;
    this.role = role;
    this.isActive = isActive;
    this.createdAt = createdAt;
  }

  static fromPersistence(data: UserPersistence): UserEntity {
    return new UserEntity(
      data.id,
      data.email,
      data.role,
      data.isActive,
      data.createdAt,
    );
  }

  static fromPersistenceArray(data: UserPersistence[]): UserEntity[] {
    return data.map((item) => UserEntity.fromPersistence(item));
  }
}
