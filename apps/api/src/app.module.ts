import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { VendorOrgsModule } from "./vendor-orgs/vendor-orgs.module";
import { SystemAssetsModule } from "./system-assets/system-assets.module";
import { UsersModule } from "./users/users.module";
import { ChangeRequestsModule } from "./change-requests/change-requests.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { StorageModule } from "./storage/storage.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    VendorOrgsModule,
    SystemAssetsModule,
    UsersModule,
    ChangeRequestsModule,
    NotificationsModule,
    StorageModule,
  ],
})
export class AppModule {}
