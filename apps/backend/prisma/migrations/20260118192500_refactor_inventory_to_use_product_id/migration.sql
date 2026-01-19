-- Step 1: Drop the existing foreign key constraint
ALTER TABLE "Inventory" DROP CONSTRAINT IF EXISTS "Inventory_productSku_fkey";

-- Step 2: Add new productId column (nullable initially to allow data migration)
ALTER TABLE "Inventory" ADD COLUMN "productId" TEXT;

-- Step 3: Migrate data from productSku to productId
-- This joins Inventory with Product to get the product id from the sku
UPDATE "Inventory" 
SET "productId" = (
  SELECT "Product"."id" 
  FROM "Product" 
  WHERE "Product"."sku" = "Inventory"."productSku"
);

-- Step 4: For any Inventory records without a matching Product, set a temporary productId
-- (This should not happen in normal circumstances, but we handle it to avoid errors)
-- If there are orphaned records, we'll delete them as they're invalid
DELETE FROM "Inventory" WHERE "productId" IS NULL;

-- Step 5: Make productId non-nullable and unique
ALTER TABLE "Inventory" ALTER COLUMN "productId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Inventory_productId_key" ON "Inventory"("productId");

-- Step 6: Drop the old productSku column and its unique index
DROP INDEX IF EXISTS "Inventory_productSku_key";
ALTER TABLE "Inventory" DROP COLUMN "productSku";

-- Step 7: Rename availableQuantity to quantity and drop reservedQuantity
-- First, update quantity to be the sum of availableQuantity and reservedQuantity (if we want to preserve total stock)
-- Or just use availableQuantity as quantity
ALTER TABLE "Inventory" RENAME COLUMN "availableQuantity" TO "quantity";
ALTER TABLE "Inventory" DROP COLUMN "reservedQuantity";

-- Step 8: Add updatedAt column with default
ALTER TABLE "Inventory" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Step 9: Create new foreign key constraint with CASCADE delete
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_productId_fkey" 
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
