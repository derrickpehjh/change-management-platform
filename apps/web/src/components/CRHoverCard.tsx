import { RISK_BADGE, STATUS_BADGE, formatShort } from "@/lib/ui";
import type { CRStatus, RiskLevel } from "@cmp/shared";

export function CRHoverCard({ crs, className = "" }: { crs: any[]; className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute z-50 w-72 rounded-lg border border-slate-200 bg-white shadow-lg p-3 space-y-2.5 text-left ${className}`}
    >
      {crs.map((cr) => {
        const risk = RISK_BADGE[cr.riskLevel as RiskLevel];
        return (
          <div
            key={cr.id}
            className="space-y-1 [&:not(:last-child)]:pb-2.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-slate-100"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${risk.chip}`}>{risk.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE[cr.status as CRStatus]}`}>
                {cr.status.replaceAll("_", " ")}
              </span>
            </div>
            <p className="text-[12.5px] font-semibold text-slate-900 leading-snug line-clamp-2">{cr.title}</p>
            <p className="text-[11px] text-slate-500">{cr.vendorOrg.name}</p>
            {cr.vendorReference && (
              <p className="text-[11px] font-code font-semibold text-primary">Ref: {cr.vendorReference}</p>
            )}
            <p className="text-[11px] font-code text-slate-400">
              {formatShort(cr.plannedStart)} – {formatShort(cr.plannedEnd)}
            </p>
            <div className="flex flex-wrap gap-1">
              {cr.systemAssets.map((a: any) => (
                <span key={a.id} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-code text-[10px]">
                  {a.name}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
