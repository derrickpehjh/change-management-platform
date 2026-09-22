import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role, JwtUser } from "@cmp/shared";
import { ROLES_KEY } from "../decorators/roles.decorator";

/**
 * Runs after JwtAuthGuard. Blocks users pending role assignment from every
 * feature endpoint, and additionally restricts to the roles listed in
 * @Roles(...) when that decorator is present on the handler/class.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtUser = request.user;

    if (!user?.role || !user?.orgType) {
      throw new ForbiddenException("Your account is pending role assignment by an admin.");
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException("You do not have permission to perform this action.");
    }

    return true;
  }
}
