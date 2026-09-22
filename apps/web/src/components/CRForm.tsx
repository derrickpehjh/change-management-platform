"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { RiskLevel } from "@cmp/shared";
import { RISK_BADGE } from "@/lib/ui";
import { Icon } from "./Icon";

export interface CRFormValues {
  title: string;
  description: string;
  riskLevel: RiskLevel;
  rollbackPlan: string;
  plannedStart: string;
  plannedEnd: string;
  systemAssetIds: string[];
}

export interface CRFormLiveState {
  conflicts: any[];
  plannedStart: string;
  plannedEnd: string;
  systemAssetNames: string[];
}

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const RISK_TIERS = [
  { level: RiskLevel.LOW, tier: "Tier 1", copy: "Routine, zero client-facing downtime or minimal failover impact." },
  { level: RiskLevel.MEDIUM, tier: "Tier 2", copy: "Configuration change or moderate service reroute with redundancy." },
  { level: RiskLevel.HIGH, tier: "Tier 3", copy: "Major upgrade, architectural shift, or critical security layer reload." },
];

export function CRForm({
  initial,
  excludeId,
  submitLabel,
  onSubmit,
  onLiveChange,
  submitting,
}: {
  initial?: Partial<CRFormValues>;
  excludeId?: string;
  submitLabel: string;
  onSubmit: (values: CRFormValues) => void;
  onLiveChange?: (state: CRFormLiveState) => void;
  submitting?: boolean;
}) {
  const { data: assets } = useQuery({ queryKey: ["system-assets"], queryFn: api.systemAssets.list });

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(initial?.riskLevel ?? RiskLevel.MEDIUM);
  const [rollbackPlan, setRollbackPlan] = useState(initial?.rollbackPlan ?? "");
  const [plannedStart, setPlannedStart] = useState(toLocalInput(initial?.plannedStart));
  const [plannedEnd, setPlannedEnd] = useState(toLocalInput(initial?.plannedEnd));
  const [systemAssetIds, setSystemAssetIds] = useState<string[]>(initial?.systemAssetIds ?? []);
  const [conflicts, setConflicts] = useState<any[]>([]);

  useEffect(() => {
    if (!plannedStart || !plannedEnd || systemAssetIds.length === 0) {
      setConflicts([]);
      onLiveChange?.({ conflicts: [], plannedStart, plannedEnd, systemAssetNames: [] });
      return;
    }
    const handle = setTimeout(() => {
      api.changeRequests
        .conflicts({
          systemAssetIds,
          plannedStart: new Date(plannedStart).toISOString(),
          plannedEnd: new Date(plannedEnd).toISOString(),
          excludeId,
        })
        .then((c) => {
          setConflicts(c);
          const names = (assets ?? []).filter((a) => systemAssetIds.includes(a.id)).map((a) => a.name);
          onLiveChange?.({ conflicts: c, plannedStart, plannedEnd, systemAssetNames: names });
        })
        .catch(() => setConflicts([]));
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plannedStart, plannedEnd, systemAssetIds, excludeId]);

  function toggleAsset(id: string) {
    setSystemAssetIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      title,
      description,
      riskLevel,
      rollbackPlan,
      plannedStart: new Date(plannedStart).toISOString(),
      plannedEnd: new Date(plannedEnd).toISOString(),
      systemAssetIds,
    });
  }

  const input =
    "w-full h-10 px-3.5 bg-white border border-slate-200 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-all";
  const textarea =
    "w-full p-3.5 bg-white border border-slate-200 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-all resize-y leading-relaxed";
  const label = "block text-xs font-medium text-slate-700";
  const sectionHead = "flex items-center justify-between pb-2 border-b border-slate-200";

  const durationMs = plannedStart && plannedEnd ? new Date(plannedEnd).getTime() - new Date(plannedStart).getTime() : 0;
  const durationLabel =
    durationMs > 0 ? `${Math.floor(durationMs / 3_600_000)}h ${Math.round((durationMs % 3_600_000) / 60_000)}m` : "—";

  return (
    <form onSubmit={submit} className="space-y-10">
      <section className="space-y-5">
        <div className={sectionHead}>
          <div>
            <h2 className="text-base font-semibold text-slate-900">General Information</h2>
            <p className="text-xs text-slate-500">Identity, scope definition, and change summary.</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className={label}>
              Change Request Title <span className="text-red-500">*</span>
            </label>
            <input
              className={input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Security Patch Deployment on IAM Gateway"
              required
              minLength={3}
            />
            <p className="text-[11px] text-slate-400">Adheres to HTX standard: [System] + [Action] + [Scope].</p>
          </div>
          <div className="space-y-1.5">
            <label className={label}>
              Description &amp; Business Justification <span className="text-red-500">*</span>
            </label>
            <textarea className={textarea} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required minLength={10} />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className={sectionHead}>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Risk &amp; Impact Assessment</h2>
            <p className="text-xs text-slate-500">Determine risk tier and declare affected infrastructure assets.</p>
          </div>
        </div>
        <div className="space-y-2">
          <label className={label}>
            Risk Classification <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {RISK_TIERS.map((t) => {
              const selected = riskLevel === t.level;
              const badge = RISK_BADGE[t.level];
              return (
                <label
                  key={t.level}
                  className={`relative flex flex-col p-3.5 bg-white border rounded-lg cursor-pointer transition-all ${
                    selected ? "border-slate-900 ring-2 ring-slate-900" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input className="sr-only" type="radio" name="risk-level" checked={selected} onChange={() => setRiskLevel(t.level)} />
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                      {badge.label} Risk
                    </span>
                    <span className="text-[10px] font-code text-slate-400">{t.tier}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">{t.copy}</p>
                </label>
              );
            })}
          </div>
        </div>
        <div className="space-y-1.5 pt-1">
          <label className={label}>
            Affected Systems &amp; Assets <span className="text-red-500">*</span>
          </label>
          <div className="p-2 bg-white border border-slate-200 rounded-md flex flex-wrap items-center gap-1.5">
            {assets?.map((a) => {
              const selected = systemAssetIds.includes(a.id);
              return (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => toggleAsset(a.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    selected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {a.name}
                </button>
              );
            })}
          </div>
          {systemAssetIds.length === 0 && <p className="text-[11px] text-slate-400">Select at least one affected system.</p>}
        </div>
      </section>

      <section className="space-y-5">
        <div className={sectionHead}>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Implementation Window</h2>
            <p className="text-xs text-slate-500">Plan execution schedule evaluated against concurrent vendor windows.</p>
          </div>
          <span className="text-[11px] font-code text-slate-500 shrink-0">UTC Standard Time</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={label}>
              Planned Start <span className="text-red-500">*</span>
            </label>
            <input type="datetime-local" className={`${input} font-code`} value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <label className={label}>
              Planned End <span className="text-red-500">*</span>
            </label>
            <input type="datetime-local" className={`${input} font-code`} value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} required />
          </div>
        </div>
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-md text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <Icon name="schedule" className="text-[16px] text-slate-400" />
            Total Duration: <strong className="font-medium text-slate-800">{durationLabel}</strong>
          </span>
        </div>

        {conflicts.length > 0 && (
          <div className="p-4 bg-white border border-amber-200 rounded-lg shadow-sm space-y-1">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Icon name="notification_important" className="text-[20px]" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                  Schedule Conflict Detected
                  <span className="text-[10px] font-code px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Non-blocking</span>
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {conflicts.map((c, i) => (
                    <span key={i} className="block">
                      {c.title ? (
                        <>
                          <strong className="font-medium text-slate-800">{c.title}</strong> ({c.vendorOrgName})
                        </>
                      ) : (
                        "Another vendor"
                      )}{" "}
                      has concurrent maintenance on{" "}
                      <code className="text-xs px-1 py-0.5 rounded bg-slate-100 text-slate-800 font-code">
                        [{c.systemAssets.join(", ")}]
                      </code>
                      .
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-5">
        <div className={sectionHead}>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Safeguards &amp; Rollback Plan</h2>
            <p className="text-xs text-slate-500">Mandatory contingencies for this change.</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className={label}>
            Contingency &amp; Rollback Procedure <span className="text-red-500">*</span>
          </label>
          <textarea
            className={`${textarea} font-code text-xs`}
            rows={4}
            value={rollbackPlan}
            onChange={(e) => setRollbackPlan(e.target.value)}
            required
            minLength={5}
          />
        </div>
      </section>

      <div className="sticky bottom-6 z-10 p-4 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg flex items-center justify-end gap-2.5">
        <button
          type="submit"
          disabled={submitting || systemAssetIds.length === 0}
          className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          <span>{submitting ? "Saving…" : submitLabel}</span>
          <Icon name="arrow_forward" className="text-[16px]" />
        </button>
      </div>
    </form>
  );
}
