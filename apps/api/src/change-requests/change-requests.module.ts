import { Module } from "@nestjs/common";
import { ChangeRequestsController } from "./change-requests.controller";
import { ChangeRequestsService } from "./change-requests.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [NotificationsModule, StorageModule],
  controllers: [ChangeRequestsController],
  providers: [ChangeRequestsService],
})
export class ChangeRequestsModule {}
