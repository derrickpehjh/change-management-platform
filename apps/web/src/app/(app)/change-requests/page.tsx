"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueries, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { CRDrawer } from "@/components/CRDrawer";
import { formatDate, RISK_BADGE, STATUS_BADGE, crCode } from "@/lib/ui";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { CRStatus, RiskLevel } from "@cmp/shared";

const TABS = [
  { key: "ALL", label: "All" },
  { key: "REVIEW", label: "Under Review", statuses: [CRStatus.SUBMITTED, CRStatus.UNDER_REVIEW] },
  { key: "APPROVED", label: "Approved", statuses: [CRStatus.APPROVED] },
  { key: "SCHEDULED", label: "Scheduled", statuses: [CRStatus.SCHEDULED] },
  { key: "REJECTED", label: "Rejected", statuses: [CRStatus.REJECTED] },
] as const;

export default function ChangeRequestsHubPage() {
  const params = useSearchParams();
  const { isCustomer } = useCurrentUser();

  const [tab, setTab] = useState<string>(params.get("status") ? "REVIEW" : "ALL");
  const [vendorFilter, setVendorFilter] = useState("ALL");
  const [systemFilter, setSystemFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [overlapFilter, setOverlapFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: crs, isLoading } = useQuery({ queryKey: ["crs", "", ""], queryFn: () => api.changeRequests.list() });
  const { data: vendorOrgs } = useQuery({ queryKey: ["vendor-orgs"], queryFn: api.vendorOrgs.list, enabled: isCustomer });
  const { data: systemAssets } = useQuery({ queryKey: ["system-assets"], queryFn: api.systemAssets.list });

  const conflictQueries = useQueries({
    queries: (crs ?? []).map((cr: any) => ({
      queryKey: ["conflicts-of", cr.id],
      queryFn: () =>
        api.changeRequests.conflicts({
          systemAssetIds: cr.systemAssets.map((a: any) => a.id),
          plannedStart: cr.plannedStart,
          plannedEnd: cr.plannedEnd,
          excludeId: cr.id,
        }),
      enabled: !!crs,
      staleTime: 30_000,
    })),
  });
  const overlapDataKey = conflictQueries.map((q) => (q.dataUpdatedAt ? 1 : 0)).join(",");
  const overlapMap = useMemo(() => {
    const map = new Map<string, any[]>();
    (crs ?? []).forEach((cr: any, i: number) => map.set(cr.id, conflictQueries[i]?.data ?? []));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crs, overlapDataKey]);

  const kpis = useMemo(() => {
    const list = crs ?? [];
    return {
      total: list.length,
      pending: list.filter((c: any) => c.status === CRStatus.SUBMITTED || c.status === CRStatus.UNDER_REVIEW).length,
      scheduled: list.filter((c: any) => c.status === CRStatus.APPROVED || c.status === CRStatus.SCHEDULED).length,
      rejected: list.filter((c: any) => c.status === CRStatus.REJECTED).length,
      vendors: new Set(list.map((c: any) => c.vendorOrgId)).size,
      overlaps: [...overlapMap.values()].filter((v) => v.length > 0).length,
    };
  }, [crs, overlapMap]);

  const filtered = useMemo(() => {
    const activeTab = TABS.find((t) => t.key === tab);
    return (crs ?? []).filter((cr: any) => {
      if (activeTab && "statuses" in activeTab && !(activeTab.statuses as readonly string[]).includes(cr.status)) return false;
      if (vendorFilter !== "ALL" && cr.vendorOrgId !== vendorFilter) return false;
      if (systemFilter !== "ALL" && !cr.systemAssets.some((a: any) => a.id === systemFilter)) return false;
      if (riskFilter !== "ALL" && cr.riskLevel !== riskFilter) return false;
      const hasOverlap = (overlapMap.get(cr.id) ?? []).length > 0;
      if (overlapFilter === "CONFLICT" && !hasOverlap) return false;
      if (overlapFilter === "CLEAN" && hasOverlap) return false;
      return true;
    });
  }, [crs, tab, vendorFilter, systemFilter, riskFilter, overlapFilter, overlapMap]);

  function resetFilters() {
    setTab("ALL");
    setVendorFilter("ALL");
    setSystemFilter("ALL");
    setRiskFilter("ALL");
    setOverlapFilter("ALL");
  }

  return (
    <div className="max-w-[1720px] mx-auto px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-code text-slate-500 uppercase tracking-wider mb-1">
            <span className="text-slate-700 font-semibold">Production Gate</span>
            <span className="text-slate-300">/</span>
            <span>Multi-Tenant Console</span>
          </div>
          <h1 className="font-headline text-[24px] font-bold text-primary tracking-tight">Change Requests Hub</h1>
          <p className="text-slate-500 text-[13px] mt-0.5">
            Unified governance pipeline monitoring vendor changes, automated collision checks, and audit trails.
          </p>
        </div>
        {!isCustomer && (
          <Link
            href="/change-requests/new"
            className="h-8 px-3 rounded-md bg-primary hover:bg-slate-800 text-white text-[12px] font-medium flex items-center gap-2 transition-colors shadow-sm shrink-0"
          >
            <Icon name="add" className="text-[16px]" />
            <span>Submit Change Request</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Active CRs" icon="tune" value={kpis.total} accent="text-primary" note={`${kpis.vendors} Partner Orgs`} note2="All Statuses" />
        <KpiCard
          label={isCustomer ? "Pending HTX Review" : "Awaiting Review"}
          icon="assignment_late"
          iconColor="text-indigo-400"
          value={kpis.pending}
          accent="text-indigo-600"
          note={kpis.overlaps > 0 ? `${kpis.overlaps} Overlaps` : "No overlaps"}
          noteColor={kpis.overlaps > 0 ? "text-amber-600" : "text-emerald-600"}
          note2="Requires Sign-off"
        />
        <KpiCard label="Scheduled & Approved" icon="event_available" iconColor="text-emerald-500" value={kpis.scheduled} accent="text-slate-900" note="Locked" noteColor="text-emerald-600" note2="Ready" />
        <KpiCard label="Rejected / Returned" icon="replay" iconColor="text-rose-400" value={kpis.rejected} accent="text-slate-900" note="Edit Phase" noteColor="text-rose-600" note2="Vendor Action" />
      </div>

      <div className="bg-white rounded-lg border border-slate-200/80 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {TABS.map((t) => {
              const count =
                t.key === "ALL" ? (crs ?? []).length : (crs ?? []).filter((c: any) => (t as any).statuses.includes(c.status)).length;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-1 rounded-md text-[12px] transition-colors whitespace-nowrap ${
                    active ? "font-semibold bg-primary text-white" : "font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {t.label} <span className={active ? "ml-1 opacity-70" : "ml-1 text-slate-400"}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center p-0.5 bg-slate-100 rounded-md text-[11px] font-medium text-slate-600">
              <button className="px-2.5 py-1 rounded bg-white shadow-xs text-primary font-semibold flex items-center gap-1">
                <Icon name="view_list" className="text-[14px]" /> Table
              </button>
              <Link href="/calendar" className="px-2.5 py-1 rounded hover:text-primary flex items-center gap-1 transition-colors">
                <Icon name="calendar_month" className="text-[14px]" /> Calendar
              </Link>
            </div>
            <button onClick={resetFilters} className="text-[12px] text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors">
              <Icon name="restart_alt" className="text-[15px]" /> Reset
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center ${isCustomer ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
          {isCustomer && (
            <FilterSelect icon="domain" value={vendorFilter} onChange={setVendorFilter}>
              <option value="ALL">All Vendors ({vendorOrgs?.length ?? 0})</option>
              {vendorOrgs?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </FilterSelect>
          )}
          <FilterSelect icon="dns" value={systemFilter} onChange={setSystemFilter}>
            <option value="ALL">All Systems</option>
            {systemAssets?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect icon="shield" value={riskFilter} onChange={setRiskFilter}>
            <option value="ALL">All Risk Levels</option>
            {Object.values(RiskLevel).map((r) => (
              <option key={r} value={r}>
                {r.charAt(0) + r.slice(1).toLowerCase()} Risk
              </option>
            ))}
          </FilterSelect>
          <FilterSelect icon="warning_amber" value={overlapFilter} onChange={setOverlapFilter}>
            <option value="ALL">All Overlap Statuses</option>
            <option value="CONFLICT">Window Conflicts Only</option>
            <option value="CLEAN">Clean Windows Only</option>
          </FilterSelect>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        <div className="flex-1 w-full bg-white rounded-lg border border-slate-200/80 overflow-hidden flex flex-col shadow-xs">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between text-slate-500 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">Active Change Requests</span>
              <span className="text-slate-300">|</span>
              <span>Showing {filtered.length} entries</span>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-semibold uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-5 w-52 font-medium">CR ID &amp; Submitter</th>
                  <th className="py-3 px-4 min-w-[240px] font-medium">Title &amp; Assets</th>
                  <th className="py-3 px-3 text-center w-24 font-medium">Risk</th>
                  <th className="py-3 px-4 min-w-[160px] font-medium">Planned Window</th>
                  <th className="py-3 px-3 w-40 font-medium">Overlap Check</th>
                  <th className="py-3 px-3 text-center w-28 font-medium">Status</th>
                  <th className="py-3 px-5 text-right w-32 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-[13px]">
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                      Loading…
                    </td>
                  </tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                      No change requests match these filters.
                    </td>
                  </tr>
                )}
                {filtered.map((cr: any) => {
                  const risk = RISK_BADGE[cr.riskLevel as RiskLevel];
                  const conflicts = overlapMap.get(cr.id) ?? [];
                  const hasConflict = conflicts.length > 0;
                  const needsReview = isCustomer && (cr.status === CRStatus.SUBMITTED || cr.status === CRStatus.UNDER_REVIEW);
                  return (
                    <tr
                      key={cr.id}
                      onClick={() => setSelectedId(cr.id)}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    >
                      <td className="py-4 px-5 align-top">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-code text-[12px] font-semibold text-primary group-hover:text-blue-600">
                              {crCode(cr.id, cr.createdAt)}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {cr.submittedBy.role === "CUSTOMER" ? "Customer" : "Vendor"}
                            </span>
                          </div>
                          <span className="font-medium text-slate-900 mt-1">{cr.submittedBy.name}</span>
                          <span className="text-[11px] text-slate-400">{cr.vendorOrg.name}</span>
                          {cr.vendorReference && (
                            <span className="text-[10px] font-code font-semibold text-primary mt-0.5">Ref: {cr.vendorReference}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-1">
                            {cr.title}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {cr.systemAssets.map((a: any) => (
                              <span key={a.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-code text-[11px]">
                                {a.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3 align-top text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${risk.chip}`}>{risk.label}</span>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col leading-tight">
                          <span className="font-code text-[12px] font-medium text-slate-900">{formatDate(cr.plannedStart)}</span>
                          <span className="text-[11px] text-slate-400 mt-0.5">UTC</span>
                        </div>
                      </td>
                      <td className="py-4 px-3 align-top">
                        {hasConflict ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Icon name="warning" className="text-[13px]" /> Overlap
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                            <Icon name="check_circle" className="text-[14px]" /> Clean
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-3 align-top text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGE[cr.status as CRStatus]}`}>
                          {cr.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="py-4 px-5 align-top text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(cr.id);
                          }}
                          className={`h-7 px-2.5 rounded text-[11px] font-medium transition-colors ${
                            needsReview ? "bg-primary hover:bg-slate-800 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          {needsReview ? "Review" : "Inspect"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {selectedId && <CRDrawer id={selectedId} onClose={() => setSelectedId(null)} />}
      </div>

      <div className="p-3 bg-white rounded-lg border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-medium text-slate-800">Tenant Isolation Enforced:</span>
          <span>External vendors only view scoped resources; HTX retains full fleet visibility.</span>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  icon,
  iconColor = "text-slate-400",
  value,
  accent,
  note,
  noteColor = "text-emerald-600",
  note2,
}: {
  label: string;
  icon: string;
  iconColor?: string;
  value: number;
  accent: string;
  note: string;
  noteColor?: string;
  note2: string;
}) {
  return (
    <div className="p-4 bg-white rounded-lg border border-slate-200/80 flex flex-col justify-between hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-[12px] font-medium text-slate-600">{label}</span>
        <Icon name={icon} className={`text-[18px] ${iconColor}`} />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={`font-headline text-[26px] font-bold leading-none ${accent}`}>{String(value).padStart(2, "0")}</span>
      </div>
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span className={noteColor}>{note}</span>
        <span className="text-slate-600 font-medium">{note2}</span>
      </div>
    </div>
  );
}

function FilterSelect({
  icon,
  value,
  onChange,
  children,
}: {
  icon: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 pl-7 pr-6 bg-slate-50 border border-slate-200/80 rounded-md text-[12px] text-slate-700 appearance-none focus:outline-none focus:border-slate-400 cursor-pointer"
      >
        {children}
      </select>
      <Icon name={icon} className="absolute left-2 top-2 text-slate-400 text-[15px] pointer-events-none" />
      <Icon name="expand_more" className="absolute right-2 top-2 text-slate-400 text-[15px] pointer-events-none" />
    </div>
  );
}
