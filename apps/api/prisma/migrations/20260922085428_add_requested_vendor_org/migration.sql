-- AlterTable
ALTER TABLE "User" ADD COLUMN     "requestedVendorOrgId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_requestedVendorOrgId_fkey" FOREIGN KEY ("requestedVendorOrgId") REFERENCES "VendorOrg"("id") ON DELETE SET NULL ON UPDATE CASCADE;
