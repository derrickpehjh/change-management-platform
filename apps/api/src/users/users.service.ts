import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { OrgType, Role, type JwtUser } from "@cmp/shared";
// Prisma's generated enums are the source of truth for the actual database
// write below — see the note in change-requests.service.ts for why the
// shared and Prisma enums, despite identical values, aren't interchangeable
// to the type checker.
import type { OrgType as PrismaOrgType, Role as PrismaRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { isCustomer } from "../common/tenant";

interface AssignUserDto {
  role: Role;
  orgType: OrgType;
  vendorOrgId: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(caller: JwtUser) {
    if (isCustomer(caller)) {
      return this.prisma.user.findMany({
        include: { vendorOrg: true },
        orderBy: [{ orgType: "asc" }, { name: "asc" }],
      });
    }
    return this.prisma.user.findMany({
      where: { vendorOrgId: caller.vendorOrgId! },
      include: { vendorOrg: true },
      orderBy: { name: "asc" },
    });
  }

  pending() {
    return this.prisma.user.findMany({
      where: { role: null },
      include: { requestedVendorOrg: true },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Customer-only: assign org + role to a new (or existing) user — the only path that can
   *  onboard a pending account, since only the customer knows which vendor company a
   *  GitLab account belongs to. There's no separate vendor-admin role to delegate this
   *  to — a vendor's own team is entirely the Vendor role. */
  async assign(id: string, dto: AssignUserDto) {
    if (dto.orgType === OrgType.VENDOR && !dto.vendorOrgId) {
      throw new ForbiddenException("A vendor org must be selected for the Vendor role");
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    return this.prisma.user.update({
      where: { id },
      data: {
        role: dto.role as unknown as PrismaRole,
        orgType: dto.orgType as unknown as PrismaOrgType,
        vendorOrgId: dto.orgType === OrgType.VENDOR ? dto.vendorOrgId : null,
        requestedVendorOrgId: null,
      },
    });
  }
}
