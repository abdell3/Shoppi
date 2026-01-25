-- Add CHECK constraint to ensure quantity >= 0
ALTER TABLE "Inventory" ADD CONSTRAINT "quantity_non_negative" CHECK ("quantity" >= 0);
