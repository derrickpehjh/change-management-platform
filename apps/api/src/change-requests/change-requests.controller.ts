import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { existsSync, mkdirSync } from "fs";
import type { Response } from "express";
import { Role, type JwtUser } from "@cmp/shared";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ChangeRequestsService } from "./change-requests.service";
import { CommentDto, ConflictQueryDto, CreateChangeRequestDto, DecisionDto, ListQueryDto, UpdateChangeRequestDto } from "./dto";
import { PrismaService } from "../prisma/prisma.service";
import { assertTenantAccess } from "../common/tenant";

const uploadsDir = process.env.UPLOADS_DIR ?? "./uploads";
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

@Controller("change-requests")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChangeRequestsController {
  constructor(
    private readonly service: ChangeRequestsService,
    private readonly prisma: PrismaService,
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

  @Post(":id/attachments")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  addAttachment(@CurrentUser() user: JwtUser, @Param("id") id: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.addAttachment(user, id, file);
  }

  @Get(":id/attachments/:attachmentId/download")
  async download(
    @CurrentUser() user: JwtUser,
    @Param("id") id: string,
    @Param("attachmentId") attachmentId: string,
    @Res() res: Response,
  ) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { cr: true },
    });
    if (!attachment || attachment.crId !== id) throw new NotFoundException("Attachment not found");
    assertTenantAccess(user, attachment.cr.vendorOrgId);
    res.download(join(process.cwd(), attachment.storedPath), attachment.filename);
  }
}
