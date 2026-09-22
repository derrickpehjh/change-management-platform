import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { JwtUser } from "@cmp/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  toJwtUser(user: {
    id: string;
    email: string;
    name: string;
    role: string | null;
    orgType: string | null;
    vendorOrgId: string | null;
  }): JwtUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as JwtUser["role"],
      orgType: user.orgType as JwtUser["orgType"],
      vendorOrgId: user.vendorOrgId,
    };
  }

  async signToken(user: JwtUser): Promise<string> {
    return this.jwtService.signAsync(user);
  }

  /** Dev-mode login: sign in directly as one of the seeded users, no GitLab round trip. */
  async devLogin(userId: string) {
    if ((process.env.AUTH_MODE ?? "mock") !== "mock") {
      throw new UnauthorizedException("Dev login is disabled when AUTH_MODE=gitlab");
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("Unknown dev user");
    const jwtUser = this.toJwtUser(user);
    return { user: jwtUser, token: await this.signToken(jwtUser) };
  }

  /** Fresh DB read for the current user, including the pending-approval self-declaration
   *  (requestedVendorOrg) that a JWT snapshot wouldn't reflect after the user submits it. */
  async getFreshUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { requestedVendorOrg: true },
    });
    if (!user) throw new NotFoundException("User not found");
    return {
      ...this.toJwtUser(user),
      requestedVendorOrgId: user.requestedVendorOrgId,
      requestedVendorOrgName: user.requestedVendorOrg?.name ?? null,
    };
  }

  /** Self-service: a pending user declares which vendor company they represent.
   *  Does NOT grant access on its own — a Customer admin still has to approve it
   *  from Admin > Users & Access, since only HTX can confirm the claim is real. */
  async requestVendor(userId: string, vendorOrgId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    if (user.role) throw new BadRequestException("Your account already has access assigned.");

    const vendorOrg = await this.prisma.vendorOrg.findUnique({ where: { id: vendorOrgId } });
    if (!vendorOrg) throw new BadRequestException("Unknown vendor organisation");

    await this.prisma.user.update({ where: { id: userId }, data: { requestedVendorOrgId: vendorOrgId } });
    return { requestedVendorOrgId: vendorOrg.id, requestedVendorOrgName: vendorOrg.name };
  }

  /** Find-or-create a platform user from a GitLab OIDC profile. New accounts start pending. */
  async findOrCreateFromGitlab(profile: { id: string; email: string; displayName: string }) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ gitlabId: profile.id }, { email: profile.email }] },
    });
    const user =
      existing ??
      (await this.prisma.user.create({
        data: {
          gitlabId: profile.id,
          email: profile.email,
          name: profile.displayName || profile.email,
        },
      }));
    return this.toJwtUser(user);
  }
}
