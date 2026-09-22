import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { JwtUser } from "@cmp/shared";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.service.list(user.id);
  }

  @Post(":id/read")
  markRead(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.service.markRead(user.id, id);
  }

  @Post("read-all")
  markAllRead(@CurrentUser() user: JwtUser) {
    return this.service.markAllRead(user.id);
  }
}
