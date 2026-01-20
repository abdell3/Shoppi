import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, NotEquals, Min, Max } from 'class-validator';

export class UpdateStockBySkuDto {
  @ApiProperty({
    description: 'SKU du produit',
    example: 'SKU-IPHONE-14-BLK',
  })
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @ApiProperty({
    description: 'Variation de stock (peut être positif ou négatif, non nul)',
    example: 5,
  })
  @IsInt()
  @NotEquals(0)
  @Min(-10000, { message: 'Delta cannot be less than -10000' })
  @Max(10000, { message: 'Delta cannot exceed 10000' })
  delta!: number;
}
