"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { CRForm, type CRFormLiveState, type CRFormValues } from "@/components/CRForm";
import { Icon } from "@/components/Icon";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function NewChangeRequestPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<CRFormLiveState | null>(null);

  async function handleSubmit(values: CRFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const cr = await api.changeRequests.create(values);
      router.push(`/change-requests/${cr.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create change request");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Change Requests</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900">New CR</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-slate-900 tracking-tight">Submit Change Request</h1>
          <p className="text-sm text-slate-500">
            Submit an auditable production change for HTX approval. Tenant: <strong className="font-medium text-slate-800">{user?.name}</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-8 items-start pb-16">
        <div className="lg:col-span-8">
          {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}
          <CRForm submitLabel="Submit for HTX Review" onSubmit={handleSubmit} onLiveChange={setLive} submitting={submitting} />
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <CollisionInspector live={live} />

          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Icon name="policy" className="text-slate-600 text-[18px]" />
              <span>Submission Guidelines</span>
            </h3>
            <ul className="text-xs text-slate-500 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span>High-risk changes should be submitted at least 48 hours prior to execution.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span>Rollback plans must specify verifiable recovery steps.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span>Drafts may be edited until HTX begins formal review.</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CollisionInspector({ live }: { live: CRFormLiveState | null }) {
  const hasWindow = !!live?.plannedStart && !!live?.plannedEnd;
  const conflicts = live?.conflicts ?? [];

  let bars: { label: string; sub: string; left: number; width: number; color: string }[] = [];
  let axisLabels: string[] = [];

  if (hasWindow) {
    const thisStart = new Date(live!.plannedStart).getTime();
    const thisEnd = new Date(live!.plannedEnd).getTime();
    const events = [
      { start: thisStart, end: thisEnd },
      ...conflicts.map((c) => ({ start: new Date(c.plannedStart).getTime(), end: new Date(c.plannedEnd).getTime() })),
    ];
    const minStart = Math.min(...events.map((e) => e.start));
    const maxEnd = Math.max(...events.map((e) => e.end));
    const pad = Math.max((maxEnd - minStart) * 0.2, 30 * 60 * 1000);
    const axisStart = minStart - pad;
    const axisEnd = maxEnd + pad;
    const span = axisEnd - axisStart;
    const pct = (t: number) => ((t - axisStart) / span) * 100;

    bars = [
      ...conflicts.map((c) => ({
        label: c.title ? c.title : "Another vendor",
        sub: `${new Date(c.plannedStart).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })} – ${new Date(
          c.plannedEnd,
        ).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}`,
        left: pct(new Date(c.plannedStart).getTime()),
        width: pct(new Date(c.plannedEnd).getTime()) - pct(new Date(c.plannedStart).getTime()),
        color: "bg-amber-500",
      })),
      {
        label: "This Request",
        sub: `${new Date(thisStart).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })} – ${new Date(
          thisEnd,
        ).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}`,
        left: pct(thisStart),
        width: pct(thisEnd) - pct(thisStart),
        color: conflicts.length > 0 ? "bg-slate-800" : "bg-emerald-600",
      },
    ];

    axisLabels = [0, 0.33, 0.66, 1].map((f) =>
      new Date(axisStart + span * f).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" }),
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Icon name="calendar_view_week" className="text-amber-600 text-[18px]" />
          <span>Collision Inspector</span>
        </h3>
        {conflicts.length > 0 && (
          <span className="text-[10px] font-code px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
            {conflicts.length} Overlap{conflicts.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">
        {hasWindow
          ? "Visual comparison of concurrent requests on the affected systems."
          : "Select systems and a planned window to preview scheduling collisions."}
      </p>
      {hasWindow && (
        <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-md space-y-3">
          <div className="flex justify-between text-[10px] font-code text-slate-400">
            {axisLabels.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
          <div className="space-y-2">
            {bars.map((b, i) => (
              <div key={i}>
                <div className={`flex justify-between text-[10px] mb-1 ${b.color === "bg-slate-800" ? "text-slate-800 font-medium" : "text-slate-500"}`}>
                  <span>{b.label}</span>
                  <span className="font-code">{b.sub}</span>
                </div>
                <div className="h-4 w-full bg-slate-200 rounded relative overflow-hidden">
                  <div className={`absolute h-full rounded ${b.color}`} style={{ left: `${b.left}%`, width: `${b.width}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="text-[11px] text-slate-400 leading-normal">
        HTX recommends non-overlapping deployment windows on shared production assets.
      </div>
    </div>
  );
}
