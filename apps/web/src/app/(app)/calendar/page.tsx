"use client";

import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { CRDrawer } from "@/components/CRDrawer";
import { CRHoverCard } from "@/components/CRHoverCard";
import { STATUS_BADGE } from "@/lib/ui";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { CRStatus } from "@cmp/shared";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type View = "month" | "week";

function mondayOf(d: Date) {
  const day = (d.getDay() + 6) % 7;
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - day);
  return m;
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtWeekRange(d: Date) {
  const end = addDays(d, 6);
  return `${d.toLocaleDateString("en-SG", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-SG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export default function CalendarPage() {
  const { isCustomer } = useCurrentUser();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [highlight, setHighlight] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const weekStart = useMemo(() => mondayOf(cursor), [cursor]);
  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);
  const monthGridStart = useMemo(() => mondayOf(monthStart), [monthStart]);

  const rangeStart = view === "week" ? weekStart : monthGridStart;
  const rangeEnd = view === "week" ? addDays(weekStart, 7) : addDays(monthGridStart, 42);
  const rangeFrom = rangeStart.toISOString();
  const rangeTo = rangeEnd.toISOString();

  const { data: entries } = useQuery({
    queryKey: ["calendar", rangeFrom, rangeTo],
    queryFn: () => api.changeRequests.calendar(rangeFrom, rangeTo),
  });

  const conflictQueries = useQueries({
    queries: (entries ?? []).map((e: any) => ({
      queryKey: ["conflicts-of", e.id],
      queryFn: () =>
        api.changeRequests.conflicts({
          systemAssetIds: e.systemAssets.map((a: any) => a.id),
          plannedStart: e.plannedStart,
          plannedEnd: e.plannedEnd,
          excludeId: e.id,
        }),
      enabled: !!entries && highlight,
      staleTime: 30_000,
    })),
  });
  const overlapKey = conflictQueries.map((q) => (q.dataUpdatedAt ? 1 : 0)).join(",");
  const overlapMap = useMemo(() => {
    const map = new Map<string, any[]>();
    (entries ?? []).forEach((e: any, i: number) => map.set(e.id, conflictQueries[i]?.data ?? []));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, overlapKey]);

  const totalOverlaps = [...overlapMap.values()].filter((v) => v.length > 0).length;
  const firstOverlapEvent = (entries ?? []).find((e: any) => (overlapMap.get(e.id) ?? []).length > 0);

  function goPrev() {
    setCursor(view === "week" ? addDays(cursor, -7) : addMonths(cursor, -1));
  }
  function goNext() {
    setCursor(view === "week" ? addDays(cursor, 7) : addMonths(cursor, 1));
  }
  function goToday() {
    setCursor(new Date());
  }

  return (
    <div className="h-[calc(100vh-6.5rem)] max-w-[1780px] mx-auto px-6 py-4 flex flex-col gap-3 overflow-hidden">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-headline text-xl font-bold text-slate-900 tracking-tight">Maintenance Calendar</h1>
          <p className="text-slate-500 text-[12px] mt-0.5">Coordinate and verify cross-vendor scheduled changes.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center p-0.5 bg-slate-100 rounded-md text-[11px] font-medium text-slate-600">
            <button
              onClick={() => setView("month")}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${
                view === "month" ? "bg-white shadow-xs text-primary font-semibold" : "hover:text-primary"
              }`}
            >
              <Icon name="calendar_month" className="text-[14px]" /> Month
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${
                view === "week" ? "bg-white shadow-xs text-primary font-semibold" : "hover:text-primary"
              }`}
            >
              <Icon name="view_week" className="text-[14px]" /> Week
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
            <button onClick={goPrev} className="text-slate-400 hover:text-slate-800">
              <Icon name="chevron_left" className="text-[18px]" />
            </button>
            <span className="text-[12px] font-medium text-slate-700 font-code whitespace-nowrap">
              {view === "week" ? fmtWeekRange(weekStart) : monthStart.toLocaleDateString("en-SG", { month: "long", year: "numeric" })}
            </span>
            <button onClick={goNext} className="text-slate-400 hover:text-slate-800">
              <Icon name="chevron_right" className="text-[18px]" />
            </button>
          </div>
          <button onClick={goToday} className="h-8 px-3 rounded-md border border-slate-200 bg-white text-[12px] font-medium text-slate-600 hover:bg-slate-50">
            Today
          </button>
          <label className="flex items-center gap-2 text-[12px] text-slate-600 cursor-pointer select-none">
            <span className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors" style={{ background: highlight ? "#0F2042" : "#CBD5E1" }}>
              <input type="checkbox" className="sr-only" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} />
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" style={{ marginLeft: highlight ? "18px" : "2px" }} />
            </span>
            Highlight Collisions
          </label>
        </div>
      </div>

      {highlight && totalOverlaps > 0 && firstOverlapEvent && (
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2 bg-amber-50/70 border border-amber-200/60 rounded-lg text-xs">
          <div className="flex items-center gap-2 text-amber-900">
            <Icon name="warning" className="text-amber-600 text-[18px]" />
            <span className="font-semibold">Potential Overlap Detected</span>
            <span className="text-amber-800/90">
              {totalOverlaps} change{totalOverlaps > 1 ? "s" : ""} share a system window with another scheduled change.
            </span>
          </div>
          <button
            onClick={() => setSelectedId(firstOverlapEvent.id)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-medium transition-colors shrink-0 flex items-center gap-1"
          >
            Inspect Conflict <Icon name="arrow_forward" className="text-[14px]" />
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col xl:flex-row gap-6 items-stretch">
        <div className="flex-1 min-h-0 w-full bg-white rounded-lg border border-slate-200/80 flex flex-col">
          {view === "week" ? (
            <WeekGrid weekStart={weekStart} entries={entries ?? []} overlapMap={overlapMap} highlight={highlight} onSelect={setSelectedId} />
          ) : (
            <MonthGrid monthGridStart={monthGridStart} monthStart={monthStart} entries={entries ?? []} overlapMap={overlapMap} highlight={highlight} onSelect={setSelectedId} />
          )}
        </div>

        {selectedId ? (
          <CRDrawer id={selectedId} onClose={() => setSelectedId(null)} />
        ) : (
          <aside className="w-full xl:w-[340px] shrink-0 h-full overflow-y-auto bg-white rounded-lg border border-slate-200/80 p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Icon name="grid_view" className="text-slate-600 text-[18px]" />
              Collision Matrix
            </h3>
            {totalOverlaps === 0 ? (
              <p className="text-xs text-slate-400">No scheduling conflicts detected in this view.</p>
            ) : (
              <div className="space-y-2">
                {(entries ?? [])
                  .filter((e: any) => (overlapMap.get(e.id) ?? []).length > 0)
                  .map((e: any) => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedId(e.id)}
                      className="w-full text-left p-2.5 rounded-md bg-amber-50/70 border border-amber-200/60 hover:bg-amber-50 transition-colors"
                    >
                      <p className="text-xs font-medium text-slate-900 line-clamp-1">{e.title}</p>
                      <p className="text-[11px] text-slate-500">{e.vendorOrg.name}</p>
                    </button>
                  ))}
              </div>
            )}
            <p className="text-[11px] text-slate-400 leading-normal pt-2 border-t border-slate-100">
              {isCustomer
                ? "Showing scheduled changes across all vendors."
                : "Only your organisation's change windows are shown — the platform never displays another vendor's calendar entries."}
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}

function WeekGrid({
  weekStart,
  entries,
  overlapMap,
  highlight,
  onSelect,
}: {
  weekStart: Date;
  entries: any[];
  overlapMap: Map<string, any[]>;
  highlight: boolean;
  onSelect: (id: string) => void;
}) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  return (
    <>
      <div className="shrink-0 grid grid-cols-[44px_repeat(7,1fr)] border-b border-slate-200 text-[11px] text-slate-500">
        <div className="p-1.5 font-code text-[10px] text-slate-400">UTC</div>
        {days.map((d) => {
          const isToday = sameDay(d, new Date());
          return (
            <div key={d.toISOString()} className={`p-1.5 text-center border-l border-slate-100 ${isToday ? "bg-amber-50/50" : ""}`}>
              <span className="font-medium text-slate-600">{WEEKDAYS[(d.getDay() + 6) % 7]}</span>{" "}
              <span className={`font-semibold ${isToday ? "text-amber-700" : "text-slate-900"}`}>{d.getDate()}</span>
            </div>
          );
        })}
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[44px_repeat(7,1fr)]">
        <div className="relative">
          {Array.from({ length: 24 }, (_, h) => (
            <span
              key={h}
              className="absolute right-1.5 -translate-y-1/2 text-[9px] font-code text-slate-300"
              style={{ top: `${(h / 24) * 100}%` }}
            >
              {h % 3 === 0 ? `${String(h).padStart(2, "0")}:00` : ""}
            </span>
          ))}
        </div>
        {days.map((day) => {
          const dayEvents = entries.filter((e: any) => sameDay(new Date(e.plannedStart), day));
          return (
            <div key={day.toISOString()} className="relative border-l border-slate-100">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="absolute left-0 right-0 border-t border-slate-50" style={{ top: `${(h / 24) * 100}%` }} />
              ))}
              {dayEvents.map((e: any, idx: number) => {
                const start = new Date(e.plannedStart);
                const end = new Date(e.plannedEnd);
                const startFrac = (start.getHours() + start.getMinutes() / 60) / 24;
                const durFrac = Math.max((end.getTime() - start.getTime()) / 3_600_000, 0.5) / 24;
                const hasConflict = highlight && (overlapMap.get(e.id) ?? []).length > 0;
                const cols = Math.min(dayEvents.length, 2);
                const width = 92 / cols;
                const left = (idx % 2) * width;
                return (
                  <div key={e.id} className="group absolute" style={{ top: `${startFrac * 100}%`, height: `${durFrac * 100}%`, left: `${left}%`, width: `${width}%` }}>
                    <button
                      onClick={() => onSelect(e.id)}
                      className={`w-full h-full rounded px-1.5 py-1 text-left overflow-hidden border text-[10px] leading-tight transition-shadow hover:shadow-md ${
                        hasConflict ? "border-amber-400 ring-1 ring-amber-300" : "border-transparent"
                      } ${STATUS_BADGE[e.status as CRStatus]}`}
                    >
                      <span className="font-medium line-clamp-2">{e.title}</span>
                      <span className="block font-code opacity-70 mt-0.5">{start.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}</span>
                      {hasConflict && <Icon name="warning" className="absolute top-0.5 right-0.5 text-[12px] text-amber-600" />}
                    </button>
                    <div className="hidden group-hover:block">
                      <CRHoverCard crs={[e]} className="top-0 left-full ml-1.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}

function MonthGrid({
  monthGridStart,
  monthStart,
  entries,
  overlapMap,
  highlight,
  onSelect,
}: {
  monthGridStart: Date;
  monthStart: Date;
  entries: any[];
  overlapMap: Map<string, any[]>;
  highlight: boolean;
  onSelect: (id: string) => void;
}) {
  const cells = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(monthGridStart, i)), [monthGridStart]);

  return (
    <>
      <div className="shrink-0 grid grid-cols-7 border-b border-slate-200 text-[11px] text-slate-500">
        {WEEKDAYS.map((w) => (
          <div key={w} className="p-1.5 text-center font-medium text-slate-600 border-l border-slate-100 first:border-l-0">
            {w}
          </div>
        ))}
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-7" style={{ gridTemplateRows: "repeat(6, minmax(0,1fr))" }}>
        {cells.map((day) => {
          const inMonth = day.getMonth() === monthStart.getMonth();
          const isToday = sameDay(day, new Date());
          const dayEvents = entries.filter((e: any) => sameDay(new Date(e.plannedStart), day));
          const visible = dayEvents.slice(0, 2);
          const overflow = dayEvents.length - visible.length;
          return (
            <div
              key={day.toISOString()}
              className={`group relative border-l border-t border-slate-100 first:border-l-0 p-1.5 flex flex-col min-h-0 ${
                inMonth ? "" : "bg-slate-50/40"
              }`}
            >
              <span className={`shrink-0 text-[11px] mb-1 ${isToday ? "h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center font-semibold" : inMonth ? "text-slate-700 font-medium" : "text-slate-300"}`}>
                {day.getDate()}
              </span>
              <div className="flex-1 min-h-0 space-y-0.5 overflow-hidden">
                {visible.map((e: any) => {
                  const hasConflict = highlight && (overlapMap.get(e.id) ?? []).length > 0;
                  return (
                    <button
                      key={e.id}
                      onClick={() => onSelect(e.id)}
                      className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] border ${
                        hasConflict ? "border-amber-400 ring-1 ring-amber-300" : "border-transparent"
                      } ${STATUS_BADGE[e.status as CRStatus]}`}
                    >
                      {e.title}
                    </button>
                  );
                })}
                {overflow > 0 && <p className="text-[10px] text-slate-400 px-1">+{overflow} more</p>}
              </div>
              {dayEvents.length > 0 && (
                <div className="hidden group-hover:block">
                  <CRHoverCard crs={dayEvents} className="top-6 left-1" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
