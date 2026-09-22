import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CALENDAR_STATUSES, WITHDRAWABLE_STATUSES, EDITABLE_STATUSES, type JwtUser } from "@cmp/shared";
// Prisma's generated CRStatus/Role are the source of truth for anything read
// from/written to the database — they're structurally distinct (nominal) enums
// from @cmp/shared's even though the string values are identical, so we use
// Prisma's own here rather than the shared ones. The shared status-list
// constants above are plain string arrays at runtime, so `.includes()`
// against a Prisma enum value still works.
import { CRStatus, Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { assertTenantAccess, isCustomer, vendorScopeWhere } from "../common/tenant";
import type { CommentDto, ConflictQueryDto, CreateChangeRequestDto, DecisionDto, ListQueryDto, UpdateChangeRequestDto } from "./dto";

const DETAIL_INCLUDE = {
  vendorOrg: true,
  submittedBy: true,
  systemAssets: true,
  comments: { include: { author: true }, orderBy: { createdAt: "asc" as const } },
  attachments: { include: { uploadedBy: true }, orderBy: { createdAt: "asc" as const } },
  auditLogs: { include: { actor: true }, orderBy: { createdAt: "asc" as const } },
};

@Injectable()
export class ChangeRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(user: JwtUser, dto: CreateChangeRequestDto) {
    if (dto.plannedEnd <= dto.plannedStart) {
      throw new BadRequestException("plannedEnd must be after plannedStart");
    }
    const cr = await this.prisma.changeRequest.create({
      data: {
        title: dto.title,
        description: dto.description,
        riskLevel: dto.riskLevel,
        rollbackPlan: dto.rollbackPlan,
        vendorReference: dto.vendorReference || null,
        plannedStart: new Date(dto.plannedStart),
        plannedEnd: new Date(dto.plannedEnd),
        status: CRStatus.DRAFT,
        vendorOrgId: user.vendorOrgId!,
        submittedById: user.id,
        systemAssets: { connect: dto.systemAssetIds.map((id) => ({ id })) },
      },
      include: DETAIL_INCLUDE,
    });
    await this.log(cr.id, user.id, "CREATED", null, CRStatus.DRAFT);
    return cr;
  }

  async update(user: JwtUser, id: string, dto: UpdateChangeRequestDto) {
    const cr = await this.getOrThrow(id);
    assertTenantAccess(user, cr.vendorOrgId);
    if (!(EDITABLE_STATUSES as readonly string[]).includes(cr.status)) {
      throw new BadRequestException(`Cannot edit a CR in ${cr.status} status`);
    }
    if (dto.plannedStart && dto.plannedEnd && dto.plannedEnd <= dto.plannedStart) {
      throw new BadRequestException("plannedEnd must be after plannedStart");
    }
    return this.prisma.changeRequest.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        riskLevel: dto.riskLevel,
        rollbackPlan: dto.rollbackPlan,
        vendorReference: dto.vendorReference !== undefined ? dto.vendorReference || null : undefined,
        plannedStart: dto.plannedStart ? new Date(dto.plannedStart) : undefined,
        plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : undefined,
        systemAssets: dto.systemAssetIds ? { set: dto.systemAssetIds.map((sid) => ({ id: sid })) } : undefined,
      },
      include: DETAIL_INCLUDE,
    });
  }

  async submit(user: JwtUser, id: string) {
    const cr = await this.getOrThrow(id);
    assertTenantAccess(user, cr.vendorOrgId);
    if (cr.status !== CRStatus.DRAFT && cr.status !== CRStatus.REJECTED) {
      throw new BadRequestException(`Cannot submit a CR in ${cr.status} status`);
    }
    const updated = await this.transition(cr.id, user.id, cr.status, CRStatus.SUBMITTED, "SUBMITTED");
    const approvers = await this.prisma.user.findMany({
      where: { role: Role.CUSTOMER },
      select: { id: true },
    });
    await this.notifications.notifyMany(
      approvers.map((a) => a.id),
      {
        type: "CR_SUBMITTED",
        title: `New change request: ${cr.title}`,
        body: `${cr.vendorOrgId} submitted "${cr.title}" for review.`,
        link: `/change-requests/${cr.id}`,
      },
    );
    return updated;
  }

  async startReview(user: JwtUser, id: string) {
    if (!isCustomer(user)) throw new BadRequestException("Only the customer can start a review");
    const cr = await this.getOrThrow(id);
    if (cr.status !== CRStatus.SUBMITTED) return cr;
    return this.transition(cr.id, user.id, cr.status, CRStatus.UNDER_REVIEW, "REVIEW_STARTED");
  }

  async decide(user: JwtUser, id: string, dto: DecisionDto) {
    if (!isCustomer(user)) throw new BadRequestException("Only the customer may approve or reject a change request");
    const cr = await this.getOrThrow(id);
    if (cr.status !== CRStatus.SUBMITTED && cr.status !== CRStatus.UNDER_REVIEW) {
      throw new BadRequestException(`Cannot decide on a CR in ${cr.status} status`);
    }
    const toStatus = dto.decision === "APPROVE" ? CRStatus.APPROVED : CRStatus.REJECTED;
    const updated = await this.transition(cr.id, user.id, cr.status, toStatus, "DECISION", dto.remark);
    await this.notifications.notify(cr.submittedById, {
      type: `CR_${toStatus}`,
      title: `${cr.title} was ${toStatus.toLowerCase()}`,
      body: dto.remark ?? `The customer has ${toStatus === CRStatus.APPROVED ? "approved" : "rejected"} this change request.`,
      link: `/change-requests/${cr.id}`,
    });
    return updated;
  }

  async withdraw(user: JwtUser, id: string) {
    const cr = await this.getOrThrow(id);
    assertTenantAccess(user, cr.vendorOrgId);
    if (!(WITHDRAWABLE_STATUSES as readonly string[]).includes(cr.status)) {
      throw new BadRequestException(`Cannot withdraw a CR in ${cr.status} status`);
    }
    return this.transition(cr.id, user.id, cr.status, CRStatus.WITHDRAWN, "WITHDRAWN");
  }

  async markImplemented(user: JwtUser, id: string) {
    const cr = await this.getOrThrow(id);
    assertTenantAccess(user, cr.vendorOrgId);
    if (cr.status !== CRStatus.APPROVED && cr.status !== CRStatus.SCHEDULED) {
      throw new BadRequestException(`Cannot implement a CR in ${cr.status} status`);
    }
    return this.transition(cr.id, user.id, cr.status, CRStatus.IMPLEMENTED, "IMPLEMENTED");
  }

  async close(user: JwtUser, id: string) {
    if (!isCustomer(user)) throw new BadRequestException("Only the customer may close a change request");
    const cr = await this.getOrThrow(id);
    if (cr.status !== CRStatus.IMPLEMENTED) {
      throw new BadRequestException(`Cannot close a CR in ${cr.status} status`);
    }
    return this.transition(cr.id, user.id, cr.status, CRStatus.CLOSED, "CLOSED");
  }

  async addComment(user: JwtUser, id: string, dto: CommentDto) {
    const cr = await this.getOrThrow(id);
    assertTenantAccess(user, cr.vendorOrgId);
    const comment = await this.prisma.comment.create({
      data: { crId: id, authorId: user.id, body: dto.body },
      include: { author: true },
    });
    await this.log(id, user.id, "COMMENT", null, null, dto.body.slice(0, 200));

    const notifyTargets = isCustomer(user)
      ? [cr.submittedById]
      : (await this.prisma.user.findMany({ where: { role: Role.CUSTOMER }, select: { id: true } })).map(
          (u) => u.id,
        );
    await this.notifications.notifyMany(notifyTargets, {
      type: "CR_COMMENT",
      title: `New comment on ${cr.title}`,
      body: dto.body.slice(0, 200),
      link: `/change-requests/${cr.id}`,
    });
    return comment;
  }

  async addAttachment(
    user: JwtUser,
    id: string,
    file: { originalname: string; path: string; mimetype: string; size: number },
  ) {
    const cr = await this.getOrThrow(id);
    assertTenantAccess(user, cr.vendorOrgId);
    return this.prisma.attachment.create({
      data: {
        crId: id,
        filename: file.originalname,
        storedPath: file.path,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedById: user.id,
      },
    });
  }

  async findAll(user: JwtUser, query: ListQueryDto) {
    const vendorFilter = isCustomer(user) ? query.vendorOrgId : undefined;
    return this.prisma.changeRequest.findMany({
      where: {
        ...vendorScopeWhere(user, vendorFilter),
        status: query.status,
        riskLevel: query.riskLevel,
        systemAssets: query.systemAssetId ? { some: { id: query.systemAssetId } } : undefined,
        plannedStart: query.from ? { gte: new Date(query.from) } : undefined,
        plannedEnd: query.to ? { lte: new Date(query.to) } : undefined,
      },
      include: { vendorOrg: true, submittedBy: true, systemAssets: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(user: JwtUser, id: string) {
    const cr = await this.prisma.changeRequest.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!cr) throw new NotFoundException("Change request not found");
    assertTenantAccess(user, cr.vendorOrgId);
    return cr;
  }

  async calendar(user: JwtUser, from: string, to: string, vendorOrgId?: string) {
    return this.prisma.changeRequest.findMany({
      where: {
        ...vendorScopeWhere(user, isCustomer(user) ? vendorOrgId : undefined),
        status: { in: [...CALENDAR_STATUSES] },
        plannedStart: { lt: new Date(to) },
        plannedEnd: { gt: new Date(from) },
      },
      include: { vendorOrg: true, systemAssets: true },
      orderBy: { plannedStart: "asc" },
    });
  }

  /** Overlap check across ALL vendors on shared systems. Vendor callers get a
   *  redacted view: a conflict is flagged, but the other vendor's identity
   *  and CR are never exposed. */
  async conflicts(user: JwtUser, dto: ConflictQueryDto) {
    const overlapping = await this.prisma.changeRequest.findMany({
      where: {
        id: dto.excludeId ? { not: dto.excludeId } : undefined,
        status: { in: [...CALENDAR_STATUSES] },
        systemAssets: { some: { id: { in: dto.systemAssetIds } } },
        plannedStart: { lt: new Date(dto.plannedEnd) },
        plannedEnd: { gt: new Date(dto.plannedStart) },
      },
      include: { systemAssets: true, vendorOrg: true },
    });

    return overlapping.map((o) => {
      const sharedAssets = o.systemAssets.filter((a) => dto.systemAssetIds.includes(a.id)).map((a) => a.name);
      const own = !isCustomer(user) && o.vendorOrgId === user.vendorOrgId;
      const visible = isCustomer(user) || own;
      return {
        systemAssets: sharedAssets,
        plannedStart: o.plannedStart,
        plannedEnd: o.plannedEnd,
        ...(visible
          ? { changeRequestId: o.id, title: o.title, vendorOrgName: o.vendorOrg.name }
          : { changeRequestId: null, title: null, vendorOrgName: null }),
      };
    });
  }

  private async getOrThrow(id: string) {
    const cr = await this.prisma.changeRequest.findUnique({ where: { id } });
    if (!cr) throw new NotFoundException("Change request not found");
    return cr;
  }

  private async transition(
    crId: string,
    actorId: string,
    from: CRStatus,
    to: CRStatus,
    action: string,
    remark?: string,
  ) {
    const [updated] = await this.prisma.$transaction([
      this.prisma.changeRequest.update({ where: { id: crId }, data: { status: to }, include: DETAIL_INCLUDE }),
      this.prisma.cRAuditLog.create({
        data: { crId, actorId, action, fromStatus: from, toStatus: to, remark },
      }),
    ]);
    return updated;
  }

  private log(crId: string, actorId: string, action: string, from: CRStatus | null, to: CRStatus | null, remark?: string) {
    return this.prisma.cRAuditLog.create({ data: { crId, actorId, action, fromStatus: from, toStatus: to, remark } });
  }
}
