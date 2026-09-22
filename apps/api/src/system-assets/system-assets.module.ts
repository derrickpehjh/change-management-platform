import { Module } from "@nestjs/common";
import { SystemAssetsController } from "./system-assets.controller";
import { SystemAssetsService } from "./system-assets.service";

@Module({
  controllers: [SystemAssetsController],
  providers: [SystemAssetsService],
  exports: [SystemAssetsService],
})
export class SystemAssetsModule {}
