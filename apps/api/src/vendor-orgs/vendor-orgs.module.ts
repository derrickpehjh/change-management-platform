import { Module } from "@nestjs/common";
import { VendorOrgsController } from "./vendor-orgs.controller";
import { VendorOrgsService } from "./vendor-orgs.service";

@Module({
  controllers: [VendorOrgsController],
  providers: [VendorOrgsService],
})
export class VendorOrgsModule {}
