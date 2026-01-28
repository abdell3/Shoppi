-- Cart: XOR userId / guestId (exactly one owner)
ALTER TABLE "Cart"
ADD CONSTRAINT "chk_cart_owner_xor"
CHECK (
  ("userId" IS NOT NULL AND "guestId" IS NULL)
  OR ("userId" IS NULL AND "guestId" IS NOT NULL)
);

-- Cart: one ACTIVE cart per userId
CREATE UNIQUE INDEX "cart_unique_active_per_user"
ON "Cart" ("userId")
WHERE "status" = 'ACTIVE' AND "userId" IS NOT NULL;

-- Cart: one ACTIVE cart per guestId
CREATE UNIQUE INDEX "cart_unique_active_per_guest"
ON "Cart" ("guestId")
WHERE "status" = 'ACTIVE' AND "guestId" IS NOT NULL;

-- CartItem: quantity >= 1
ALTER TABLE "CartItem"
ADD CONSTRAINT "chk_cart_item_quantity_positive"
CHECK (quantity >= 1);
