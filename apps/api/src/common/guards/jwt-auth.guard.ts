import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { JwtUser } from "@cmp/shared";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const cookieName = process.env.COOKIE_NAME ?? "cmp_session";
    const token = request.cookies?.[cookieName];

    if (!token) {
      throw new UnauthorizedException("Not signed in");
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtUser>(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Session expired or invalid");
    }
  }
}
