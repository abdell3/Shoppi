ALTER TABLE "Inventory" DROP CONSTRAINT IF EXISTS "Inventory_productSku_fkey";

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Inventory' AND column_name = 'productId'
  ) THEN
    ALTER TABLE "Inventory" ADD COLUMN "productId" TEXT;
  END IF;
END $$;

UPDATE "Inventory" 
SET "productId" = (
  SELECT "Product"."id" 
  FROM "Product" 
  WHERE "Product"."sku" = "Inventory"."productSku"
)
WHERE "productId" IS NULL;

DELETE FROM "Inventory" WHERE "productId" IS NULL;

ALTER TABLE "Inventory" ALTER COLUMN "productId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Inventory_productId_key" ON "Inventory"("productId");

DROP INDEX IF EXISTS "Inventory_productSku_key";
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Inventory' AND column_name = 'productSku'
  ) THEN
    ALTER TABLE "Inventory" DROP COLUMN "productSku";
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Inventory' AND column_name = 'availableQuantity'
  ) THEN
    ALTER TABLE "Inventory" RENAME COLUMN "availableQuantity" TO "quantity";
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Inventory' AND column_name = 'reservedQuantity'
  ) THEN
    ALTER TABLE "Inventory" DROP COLUMN "reservedQuantity";
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Inventory' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE "Inventory" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Inventory' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "Inventory" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

ALTER TABLE "Inventory" DROP CONSTRAINT IF EXISTS "Inventory_productId_fkey";

ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_productId_fkey" 
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
