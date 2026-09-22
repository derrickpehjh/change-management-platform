"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, RISK_BADGE, crCode } from "@/lib/ui";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Icon } from "./Icon";
import { CRStatus, EDITABLE_STATUSES, WITHDRAWABLE_STATUSES } from "@cmp/shared";

export function CRDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { user, isCustomer } = useCurrentUser();
  const [remark, setRemark] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: cr, isLoading } = useQuery({ queryKey: ["cr", id], queryFn: () => api.changeRequests.get(id) });
  const { data: conflicts } = useQuery({
    queryKey: ["conflicts-of", id],
    queryFn: () =>
      cr
        ? api.changeRequests.conflicts({
            systemAssetIds: cr.systemAssets.map((a: any) => a.id),
            plannedStart: cr.plannedStart,
            plannedEnd: cr.plannedEnd,
            excludeId: cr.id,
          })
        : Promise.resolve([]),
    enabled: !!cr,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["cr", id] });
    queryClient.invalidateQueries({ queryKey: ["crs"] });
  };

  const runAction = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: invalidate,
    onError: (e) => setError(e instanceof ApiError ? e.message : "Action failed"),
  });

  if (isLoading || !cr) {
    return (
      <aside className="w-full xl:w-[400px] shrink-0 bg-white rounded-lg border border-slate-200/80 p-6 flex items-center justify-center sticky top-20 shadow-xs">
        <span className="text-slate-400 font-code text-xs">Loading…</span>
      </aside>
    );
  }

  const isOwnVendor = !isCustomer && user?.vendorOrgId === cr.vendorOrgId;
  const canDecide = isCustomer && (cr.status === CRStatus.SUBMITTED || cr.status === CRStatus.UNDER_REVIEW);
  const canSubmit = isOwnVendor && (EDITABLE_STATUSES as readonly string[]).includes(cr.status);
  const canWithdraw = isOwnVendor && (WITHDRAWABLE_STATUSES as readonly string[]).includes(cr.status);
  const risk = RISK_BADGE[cr.riskLevel as keyof typeof RISK_BADGE];
  const hasConflict = conflicts && conflicts.length > 0;

  return (
    <aside className="w-full xl:w-[400px] shrink-0 bg-white rounded-lg border border-slate-200/80 overflow-hidden flex flex-col sticky top-20 shadow-xs">
      <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-code text-[12px] font-semibold text-primary">{crCode(cr.id, cr.createdAt)}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${risk.chip}`}>{risk.label} Risk</span>
          </div>
          <h2 className="font-semibold text-slate-900 text-[14px] leading-snug line-clamp-2">{cr.title}</h2>
        </div>
        <button aria-label="Close" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-50 transition-colors">
          <Icon name="close" className="text-[17px]" />
        </button>
      </div>

      {hasConflict && (
        <div className="bg-amber-50/70 border-b border-amber-200/60 p-3.5 flex items-start gap-2.5">
          <Icon name="warning" className="text-amber-600 text-[18px] shrink-0 mt-0.5" />
          <div className="text-[12px] text-amber-900 leading-relaxed">
            <span className="font-semibold">Schedule Overlap Alert</span>
            <p className="text-amber-800 text-[11px] mt-0.5">
              {conflicts![0].title
                ? `Overlaps with "${conflicts![0].title}" on ${conflicts![0].systemAssets.join(", ")}.`
                : `Overlaps with another vendor's scheduled change on ${conflicts![0].systemAssets.join(", ")}.`}{" "}
              HTX approver must sequence before final lock.
            </p>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
            <span className="text-slate-400 text-[10px] uppercase font-medium block">Vendor Org</span>
            <span className="font-medium text-slate-900 mt-0.5 block truncate">{cr.vendorOrg.name}</span>
          </div>
          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
            <span className="text-slate-400 text-[10px] uppercase font-medium block">Submitter</span>
            <span className="font-medium text-slate-900 mt-0.5 block truncate">{cr.submittedBy.name}</span>
          </div>
          {cr.vendorReference && (
            <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100 col-span-2">
              <span className="text-slate-400 text-[10px] uppercase font-medium block">Vendor Reference</span>
              <span className="font-code text-[12px] font-medium text-slate-900 mt-0.5 block truncate">{cr.vendorReference}</span>
            </div>
          )}
          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100 col-span-2 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-medium block">Planned Window</span>
              <span className="font-code text-[12px] font-semibold text-slate-900 mt-0.5 block">
                {formatDateTime(cr.plannedStart)} — {formatDateTime(cr.plannedEnd)}
              </span>
            </div>
          </div>
        </div>

        <div>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1.5">Affected Target Assets</span>
          <div className="flex flex-wrap gap-1.5">
            {cr.systemAssets.map((a: any) => (
              <span key={a.id} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-code text-[11px]">
                {a.name}
              </span>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-md bg-slate-50 border border-slate-100 space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-700">Rollback Strategy</span>
          <p className="text-[12px] text-slate-600 italic leading-relaxed">&ldquo;{cr.rollbackPlan}&rdquo;</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Latest Activity</span>
          </div>
          <div className="relative pl-4 space-y-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200 text-[12px]">
            {[...cr.auditLogs]
              .slice(-3)
              .reverse()
              .map((log: any) => (
                <div key={log.id} className="relative">
                  <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-white" />
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{log.actor.name}</span>
                    <span className="text-[10px] text-slate-400">{formatDateTime(log.createdAt)}</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">{log.action.replaceAll("_", " ").toLowerCase()}</p>
                </div>
              ))}
          </div>
        </div>

        {error && <p className="text-[12px] text-rose-600">{error}</p>}

        {canDecide && (
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <label className="block text-[11px] font-medium text-slate-600">Approver Remark (Optional)</label>
            <textarea
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-[12px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 resize-none transition-colors"
              placeholder="Add operational notes or sequencing instructions..."
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => runAction.mutate(() => api.changeRequests.decide(cr.id, "APPROVE", remark || undefined))}
                className="h-9 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[12px] flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Icon name="check" className="text-[16px]" />
                <span>Approve &amp; Lock</span>
              </button>
              <button
                onClick={() => runAction.mutate(() => api.changeRequests.decide(cr.id, "REJECT", remark || undefined))}
                className="h-9 rounded-md bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-700 font-medium text-[12px] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Icon name="undo" className="text-[16px]" />
                <span>Return Edit</span>
              </button>
            </div>
          </div>
        )}

        {(canSubmit || canWithdraw) && (
          <div className="pt-3 border-t border-slate-100 flex gap-2">
            {canSubmit && (
              <button
                onClick={() => runAction.mutate(() => api.changeRequests.submit(cr.id))}
                className="flex-1 h-9 rounded-md bg-primary hover:bg-slate-800 text-white font-medium text-[12px] transition-colors"
              >
                {cr.status === CRStatus.REJECTED ? "Resubmit" : "Submit for Review"}
              </button>
            )}
            {canWithdraw && (
              <button
                onClick={() => runAction.mutate(() => api.changeRequests.withdraw(cr.id))}
                className="flex-1 h-9 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium text-[12px] transition-colors"
              >
                Withdraw
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-100">
        <Link
          href={`/change-requests/${cr.id}`}
          className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-slate-600 hover:text-primary transition-colors"
        >
          <span>View Full Details &amp; Discussion</span>
          <Icon name="arrow_forward" className="text-[14px]" />
        </Link>
      </div>
    </aside>
  );
}
