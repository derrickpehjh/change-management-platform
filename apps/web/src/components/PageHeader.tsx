export function PageHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      {eyebrow && <p className="text-[11px] font-code text-slate-500 uppercase tracking-wider mb-1">{eyebrow}</p>}
      <h1 className="font-headline text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
      {subtitle && <p className="text-slate-500 text-[13px] mt-0.5">{subtitle}</p>}
    </div>
  );
}
