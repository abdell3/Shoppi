import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MergeCartDto {
  @ApiProperty({ description: 'Guest cart ID (X-Guest-Id value)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  guestId!: string;
}
