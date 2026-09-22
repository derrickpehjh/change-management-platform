"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";

export default function VendorOrgsAdminPage() {
  const queryClient = useQueryClient();
  const { data: orgs } = useQuery({ queryKey: ["vendor-orgs"], queryFn: api.vendorOrgs.list });
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.vendorOrgs.create(name.trim());
      setName("");
      queryClient.invalidateQueries({ queryKey: ["vendor-orgs"] });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-2 space-y-6">
      <PageHeader
        eyebrow="Governance / Admin"
        title="Vendor Organisations"
        subtitle="Onboard a new vendor company. Their users are then assigned to this org from Users & Access."
      />
      <form onSubmit={create} className="bg-white border border-slate-200/80 rounded-lg p-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Vendor company name"
          className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
        />
        <button disabled={saving} className="rounded-md bg-primary hover:bg-slate-800 text-white font-medium px-4 py-2 text-sm transition-colors flex items-center gap-1.5">
          <Icon name="add" className="text-[16px]" />
          Add vendor
        </button>
      </form>
      <div className="rounded-lg border border-slate-200/80 bg-white divide-y divide-slate-100">
        {orgs?.map((o) => (
          <div key={o.id} className="px-4 py-3 text-sm text-slate-900 flex items-center gap-2">
            <Icon name="domain" className="text-[16px] text-slate-400" />
            {o.name}
          </div>
        ))}
      </div>
    </div>
  );
}
