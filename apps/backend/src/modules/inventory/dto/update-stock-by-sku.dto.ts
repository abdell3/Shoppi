import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, NotEquals } from 'class-validator';

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
  delta!: number;
}
