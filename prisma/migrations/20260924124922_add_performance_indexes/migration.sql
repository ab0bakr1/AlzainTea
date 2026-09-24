-- DropIndex
DROP INDEX "Order_userId_idx";

-- DropIndex
DROP INDEX "Review_productId_idx";

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_createdAt_idx" ON "Order"("paymentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_paymentStatus_createdAt_idx" ON "Order"("status", "paymentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Product_status_categoryId_idx" ON "Product"("status", "categoryId");

-- CreateIndex
CREATE INDEX "Product_status_createdAt_idx" ON "Product"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Review_productId_status_idx" ON "Review"("productId", "status");
