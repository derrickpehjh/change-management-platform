import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IsOptional, IsString, MinLength } from "class-validator";
import { Role } from "@cmp/shared";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { SystemAssetsService } from "./system-assets.service";

class CreateSystemAssetDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

@Controller("system-assets")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemAssetsController {
  constructor(private readonly service: SystemAssetsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  @Roles(Role.CUSTOMER)
  create(@Body() dto: CreateSystemAssetDto) {
    return this.service.create(dto.name, dto.description);
  }

  @Delete(":id")
  @Roles(Role.CUSTOMER)
  remove(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
