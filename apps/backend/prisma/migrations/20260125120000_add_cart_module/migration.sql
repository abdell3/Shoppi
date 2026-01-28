-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestId" TEXT,
    "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cart_userId_idx" ON "Cart"("userId");

-- CreateIndex
CREATE INDEX "Cart_guestId_idx" ON "Cart"("guestId");

-- CreateIndex
CREATE INDEX "Cart_status_idx" ON "Cart"("status");

-- CreateIndex
CREATE INDEX "Cart_updatedAt_idx" ON "Cart"("updatedAt");

-- CreateIndex
CREATE INDEX "Cart_userId_status_idx" ON "Cart"("userId", "status");

-- CreateIndex
CREATE INDEX "Cart_guestId_status_idx" ON "Cart"("guestId", "status");

-- CreateIndex
CREATE INDEX "Cart_status_updatedAt_idx" ON "Cart"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_key" ON "CartItem"("cartId", "productId");

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
