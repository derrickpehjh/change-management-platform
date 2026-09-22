import { Module } from "@nestjs/common";
import { ChangeRequestsController } from "./change-requests.controller";
import { ChangeRequestsService } from "./change-requests.service";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [StorageModule],
  controllers: [ChangeRequestsController],
  providers: [ChangeRequestsService],
})
export class ChangeRequestsModule {}
