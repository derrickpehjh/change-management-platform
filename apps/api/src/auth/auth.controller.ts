import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";
import { IsString } from "class-validator";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";

class DevLoginDto {
  @IsString()
  userId!: string;
}

function authMode() {
  return process.env.AUTH_MODE ?? "mock";
}

function cookieOpts() {
  // Local dev: frontend/backend are same-site (both on localhost, different
  // ports), so Lax + non-Secure works over plain http. A hosted deployment
  // (e.g. Vercel frontend + Railway API) puts them on different registrable
  // domains, which is genuinely cross-site — the cookie then needs
  // SameSite=None and Secure or the browser won't send it on API calls.
  const crossSite = process.env.COOKIE_CROSS_SITE === "true";
  return {
    httpOnly: true,
    sameSite: (crossSite ? "none" : "lax") as "none" | "lax",
    secure: crossSite || process.env.NODE_ENV === "production",
    maxAge: 12 * 60 * 60 * 1000,
    path: "/",
  };
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("mode")
  mode() {
    return { mode: authMode() };
  }

  /** Dummy "GitLab SSO" login screen: lists seeded users to sign in as. Mock mode only. */
  @Get("dev-users")
  async devUsers() {
    if (authMode() !== "mock") throw new NotFoundException();
    const users = await this.prisma.user.findMany({
      include: { vendorOrg: true },
      orderBy: [{ orgType: "asc" }, { name: "asc" }],
    });
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      orgType: u.orgType,
      vendorOrgName: u.vendorOrg?.name ?? null,
    }));
  }

  @Post("dev-login")
  async devLogin(@Body() dto: DevLoginDto, @Res({ passthrough: true }) res: Response) {
    if (authMode() !== "mock") throw new BadRequestException("Dev login disabled");
    const { user, token } = await this.authService.devLogin(dto.userId);
    res.cookie(process.env.COOKIE_NAME ?? "cmp_session", token, cookieOpts());
    return { user };
  }

  @Get("gitlab")
  @UseGuards(AuthGuard("gitlab"))
  gitlabLogin() {
    // Redirect handled by passport-openidconnect.
  }

  @Get("gitlab/callback")
  @UseGuards(AuthGuard("gitlab"))
  async gitlabCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    const token = await this.authService.signToken(user);
    res.cookie(process.env.COOKIE_NAME ?? "cmp_session", token, cookieOpts());
    res.redirect(process.env.WEB_ORIGIN ?? "http://localhost:3000");
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    return { user: req.user };
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(process.env.COOKIE_NAME ?? "cmp_session", { path: "/" });
    return { ok: true };
  }
}
