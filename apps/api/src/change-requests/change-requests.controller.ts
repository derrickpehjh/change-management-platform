import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Role, type JwtUser } from "@cmp/shared";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ChangeRequestsService } from "./change-requests.service";
import { CommentDto, ConflictQueryDto, CreateChangeRequestDto, DecisionDto, ListQueryDto, UpdateChangeRequestDto } from "./dto";

@Controller("change-requests")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChangeRequestsController {
  constructor(
    private readonly service: ChangeRequestsService,
  ) {}

  @Post()
  @Roles(Role.VENDOR)
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateChangeRequestDto) {
    return this.service.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtUser, @Query() query: ListQueryDto) {
    return this.service.findAll(user, query);
  }

  @Post("conflicts")
  conflicts(@CurrentUser() user: JwtUser, @Body() dto: ConflictQueryDto) {
    return this.service.conflicts(user, dto);
  }

  @Get("calendar")
  calendar(
    @CurrentUser() user: JwtUser,
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("vendorOrgId") vendorOrgId?: string,
  ) {
    return this.service.calendar(user, from, to, vendorOrgId);
  }

  @Get(":id")
  findOne(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.service.findOne(user, id);
  }

  @Patch(":id")
  @Roles(Role.VENDOR)
  update(@CurrentUser() user: JwtUser, @Param("id") id: string, @Body() dto: UpdateChangeRequestDto) {
    return this.service.update(user, id, dto);
  }

  @Post(":id/submit")
  @Roles(Role.VENDOR)
  submit(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.service.submit(user, id);
  }

  @Post(":id/start-review")
  @Roles(Role.CUSTOMER)
  startReview(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.service.startReview(user, id);
  }

  @Post(":id/decision")
  @Roles(Role.CUSTOMER)
  decide(@CurrentUser() user: JwtUser, @Param("id") id: string, @Body() dto: DecisionDto) {
    return this.service.decide(user, id, dto);
  }

  @Post(":id/withdraw")
  @Roles(Role.VENDOR)
  withdraw(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.service.withdraw(user, id);
  }

  @Post(":id/delete")
  @Roles(Role.VENDOR)
  @HttpCode(204)
  remove(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.service.remove(user, id);
  }

  @Post(":id/implemented")
  markImplemented(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.service.markImplemented(user, id);
  }

  @Post(":id/close")
  @Roles(Role.CUSTOMER)
  close(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.service.close(user, id);
  }

  @Post(":id/comments")
  addComment(@CurrentUser() user: JwtUser, @Param("id") id: string, @Body() dto: CommentDto) {
    return this.service.addComment(user, id, dto);
  }
}
