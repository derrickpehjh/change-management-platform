"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { ROLE_LABELS } from "@/lib/ui";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { OrgType, Role } from "@cmp/shared";

export default function UsersAdminPage() {
  const queryClient = useQueryClient();
  const { isCustomer } = useCurrentUser();
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: api.users.list });
  const { data: pending } = useQuery({ queryKey: ["pending-users"], queryFn: api.users.pending, enabled: isCustomer });
  const { data: vendorOrgs } = useQuery({ queryKey: ["vendor-orgs"], queryFn: api.vendorOrgs.list, enabled: isCustomer });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["pending-users"] });
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-2 space-y-6">
      <PageHeader eyebrow="Governance / Admin" title="Users & Access" subtitle="Assign roles and organisations for GitLab-authenticated accounts." />

      {isCustomer && pending && pending.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider mb-2">Pending access ({pending.length})</h2>
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 divide-y divide-amber-200/60">
            {pending.map((u: any) => (
              <PendingRow key={u.id} user={u} vendorOrgs={vendorOrgs ?? []} onAssigned={refresh} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {isCustomer ? "All users" : "Your organisation's users"}
        </h2>
        <div className="rounded-lg border border-slate-200/80 bg-white divide-y divide-slate-100">
          {users?.map((u: any) => (
            <div key={u.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{u.name}</p>
                <p className="text-xs text-slate-400 font-code">
                  {u.email} {u.vendorOrg ? `· ${u.vendorOrg.name}` : ""}
                </p>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {u.role ? ROLE_LABELS[u.role] : "Pending"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PendingRow({ user, vendorOrgs, onAssigned }: { user: any; vendorOrgs: any[]; onAssigned: () => void }) {
  const [orgType, setOrgType] = useState<OrgType>(OrgType.VENDOR);
  const [role, setRole] = useState<Role>(Role.VENDOR);
  const [vendorOrgId, setVendorOrgId] = useState(vendorOrgs[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  function setOrg(next: OrgType) {
    setOrgType(next);
    setRole(next === OrgType.VENDOR ? Role.VENDOR : Role.CUSTOMER);
  }

  async function assign() {
    setSaving(true);
    try {
      await api.users.assign(user.id, { role, orgType, vendorOrgId: orgType === OrgType.VENDOR ? vendorOrgId : undefined });
      onAssigned();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 py-3 flex flex-wrap items-center gap-2">
      <div className="flex-1 min-w-[160px]">
        <p className="text-sm font-medium text-slate-900">{user.name}</p>
        <p className="text-xs text-slate-400 font-code">{user.email}</p>
      </div>
      <select value={orgType} onChange={(e) => setOrg(e.target.value as OrgType)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs">
        <option value={OrgType.VENDOR}>Vendor</option>
        <option value={OrgType.HTX}>Customer</option>
      </select>
      {orgType === OrgType.VENDOR && (
        <select value={vendorOrgId} onChange={(e) => setVendorOrgId(e.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs">
          {vendorOrgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      )}
      <span className="text-xs font-code text-slate-500 px-2">{ROLE_LABELS[role]}</span>
      <button onClick={assign} disabled={saving} className="rounded-md bg-primary hover:bg-slate-800 text-white text-xs font-medium px-3 py-1.5 transition-colors">
        {saving ? "Saving…" : "Grant access"}
      </button>
    </div>
  );
}
