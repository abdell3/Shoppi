import { ApiProperty } from '@nestjs/swagger';
import { IsInt, NotEquals } from 'class-validator';

export class UpdateStockDeltaDto {
  @ApiProperty({
    description: 'Variation de stock (peut être positif ou négatif, non nul)',
    example: 5,
  })
  @IsInt()
  @NotEquals(0)
  delta!: number;
}
