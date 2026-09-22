"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";

export default function SystemAssetsAdminPage() {
  const queryClient = useQueryClient();
  const { data: assets } = useQuery({ queryKey: ["system-assets"], queryFn: api.systemAssets.list });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["system-assets"] });
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.systemAssets.create(name.trim(), description.trim() || undefined);
      setName("");
      setDescription("");
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await api.systemAssets.remove(id);
    refresh();
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-2 space-y-6">
      <PageHeader
        eyebrow="Governance / Admin"
        title="System Inventory"
        subtitle="The systems/assets vendors can tag a change request against — the basis for calendar conflict detection."
      />

      <form onSubmit={create} className="bg-white border border-slate-200/80 rounded-lg p-4 flex gap-2 flex-wrap">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Asset name"
          className="flex-1 min-w-[160px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="flex-1 min-w-[200px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
        />
        <button disabled={saving} className="rounded-md bg-primary hover:bg-slate-800 text-white font-medium px-4 py-2 text-sm transition-colors flex items-center gap-1.5">
          <Icon name="add" className="text-[16px]" />
          Add
        </button>
      </form>

      <div className="rounded-lg border border-slate-200/80 bg-white divide-y divide-slate-100">
        {assets?.map((a) => (
          <div key={a.id} className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">{a.name}</p>
              {a.description && <p className="text-xs text-slate-400">{a.description}</p>}
            </div>
            <button onClick={() => remove(a.id)} className="text-xs text-rose-600 hover:underline">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
