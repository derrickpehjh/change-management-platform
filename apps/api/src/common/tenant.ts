import { ForbiddenException } from "@nestjs/common";
import { Role, type JwtUser } from "@cmp/shared";

export function isCustomer(user: JwtUser): boolean {
  return user.role === Role.CUSTOMER;
}

/**
 * Application-layer tenant guard: every change-request (and everything that
 * hangs off one — comments, audit log) is scoped to the owning
 * vendor org. The Customer role sees everything; the Vendor role never sees
 * another vendor's rows. This is enforced here in the data-access layer (not
 * the UI), and mirrored by Postgres row-level security policies in
 * prisma/rls.sql for defense in depth in production. See README > Multi-tenancy.
 */
export function assertTenantAccess(user: JwtUser, resourceVendorOrgId: string): void {
  if (isCustomer(user)) return;
  if (user.vendorOrgId !== resourceVendorOrgId) {
    throw new ForbiddenException("You do not have access to this vendor's data.");
  }
}

/** Prisma `where` fragment restricting a change-request query to what this user may see. */
export function vendorScopeWhere(user: JwtUser, vendorOrgIdFilter?: string) {
  if (isCustomer(user)) {
    return vendorOrgIdFilter ? { vendorOrgId: vendorOrgIdFilter } : {};
  }
  return { vendorOrgId: user.vendorOrgId! };
}
