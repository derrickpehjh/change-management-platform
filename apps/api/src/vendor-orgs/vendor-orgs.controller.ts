import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { Role } from "@cmp/shared";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { VendorOrgsService } from "./vendor-orgs.service";

class CreateVendorOrgDto {
  @IsString()
  @MinLength(2)
  name!: string;
}

@Controller("vendor-orgs")
@UseGuards(JwtAuthGuard)
export class VendorOrgsController {
  constructor(private readonly service: VendorOrgsService) {}

  // Intentionally JwtAuthGuard-only (no RolesGuard): a pending user with no
  // role yet still needs to list vendor orgs to self-declare which one they
  // represent (see AuthController.requestVendor).
  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  create(@Body() dto: CreateVendorOrgDto) {
    return this.service.create(dto.name);
  }
}
