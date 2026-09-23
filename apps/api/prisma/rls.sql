-- Defense-in-depth row-level security for production.
--
-- The application already scopes every query by vendorOrgId at the data-access
-- layer (see src/common/tenant.ts). This file adds a second, database-level
-- guarantee so a bug in application code cannot leak one vendor's data to
-- another.
--
-- IMPORTANT: RLS is bypassed by table owners and superusers. For this to do
-- anything, the app's runtime DB role must be a non-superuser that does NOT
-- own these tables (e.g. run migrations as `cmp_migrator`, run the app as
-- `cmp_app`, and GRANT the needed privileges to `cmp_app`). On a local dev
-- Postgres where everything runs as one superuser role, these policies are
-- inert — that's expected; local dev relies on the application-layer scoping.
--
-- Run this manually against production after migrations:
--   psql "$DATABASE_URL" -f prisma/rls.sql

ALTER TABLE "ChangeRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChangeRequest" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" FORCE ROW LEVEL SECURITY;

ALTER TABLE "CRAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CRAuditLog" FORCE ROW LEVEL SECURITY;

-- The app sets these two session variables (via `SET LOCAL`) at the start of
-- every request transaction, from the authenticated JWT — never from
-- user-supplied input:
--   app.is_customer          'true' | 'false'
--   app.vendor_org_id   the caller's vendor org id (irrelevant when is_customer)

DROP POLICY IF EXISTS tenant_isolation ON "ChangeRequest";
CREATE POLICY tenant_isolation ON "ChangeRequest"
  USING (
    current_setting('app.is_customer', true) = 'true'
    OR "vendorOrgId" = current_setting('app.vendor_org_id', true)
  );

DROP POLICY IF EXISTS tenant_isolation ON "Comment";
CREATE POLICY tenant_isolation ON "Comment"
  USING (
    current_setting('app.is_customer', true) = 'true'
    OR EXISTS (
      SELECT 1 FROM "ChangeRequest" cr
      WHERE cr.id = "Comment"."crId"
        AND cr."vendorOrgId" = current_setting('app.vendor_org_id', true)
    )
  );

DROP POLICY IF EXISTS tenant_isolation ON "CRAuditLog";
CREATE POLICY tenant_isolation ON "CRAuditLog"
  USING (
    current_setting('app.is_customer', true) = 'true'
    OR EXISTS (
      SELECT 1 FROM "ChangeRequest" cr
      WHERE cr.id = "CRAuditLog"."crId"
        AND cr."vendorOrgId" = current_setting('app.vendor_org_id', true)
    )
  );
