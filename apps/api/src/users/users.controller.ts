import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { OrgType, Role } from "@cmp/shared";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { JwtUser } from "@cmp/shared";
import { UsersService } from "./users.service";

class AssignUserDto {
  @IsEnum(Role)
  role!: Role;

  @IsEnum(OrgType)
  orgType!: OrgType;

  @IsOptional()
  @IsString()
  vendorOrgId?: string;
}

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.service.list(user);
  }

  @Get("pending")
  @Roles(Role.CUSTOMER)
  pending() {
    return this.service.pending();
  }

  @Patch(":id/assign")
  @Roles(Role.CUSTOMER)
  assign(@Param("id") id: string, @Body() dto: AssignUserDto) {
    return this.service.assign(id, { role: dto.role, orgType: dto.orgType, vendorOrgId: dto.vendorOrgId ?? null });
  }
}
