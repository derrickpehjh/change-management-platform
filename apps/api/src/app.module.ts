import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env.validation";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { VendorOrgsModule } from "./vendor-orgs/vendor-orgs.module";
import { SystemAssetsModule } from "./system-assets/system-assets.module";
import { UsersModule } from "./users/users.module";
import { ChangeRequestsModule } from "./change-requests/change-requests.module";
import { StorageModule } from "./storage/storage.module";
import { HealthController } from "./health/health.controller";

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    VendorOrgsModule,
    SystemAssetsModule,
    UsersModule,
    ChangeRequestsModule,
    StorageModule,
  ],
})
export class AppModule {}
