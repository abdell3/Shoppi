import { ApiProperty } from '@nestjs/swagger';
import { IsInt, NotEquals, Min, Max } from 'class-validator';

export class UpdateStockDeltaDto {
  @ApiProperty({
    description: 'Variation de stock (peut être positif ou négatif, non nul, entre -10000 et 10000)',
    example: 5,
    minimum: -10000,
    maximum: 10000,
  })
  @IsInt()
  @NotEquals(0)
  @Min(-10000, { message: 'Delta cannot be less than -10000' })
  @Max(10000, { message: 'Delta cannot exceed 10000' })
  delta!: number;
}
