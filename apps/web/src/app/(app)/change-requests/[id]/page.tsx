"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, DEMO_MODE } from "@/lib/api";
import { CRForm, type CRFormValues } from "@/components/CRForm";
import { Icon } from "@/components/Icon";
import { formatDateTime, RISK_BADGE, STATUS_BADGE, crCode } from "@/lib/ui";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { CRStatus, EDITABLE_STATUSES, WITHDRAWABLE_STATUSES } from "@cmp/shared";

export default function ChangeRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isCustomer } = useCurrentUser();
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState("");
  const [remark, setRemark] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: cr, isLoading } = useQuery({ queryKey: ["cr", id], queryFn: () => api.changeRequests.get(id) });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["cr", id] });
    queryClient.invalidateQueries({ queryKey: ["crs"] });
  };

  const runAction = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: invalidate,
    onError: (e) => setActionError(e instanceof ApiError ? e.message : "Action failed"),
  });

  useEffect(() => {
    if (cr && isCustomer && cr.status === CRStatus.SUBMITTED) {
      api.changeRequests.startReview(cr.id).then(invalidate).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cr?.id, cr?.status, isCustomer]);

  if (isLoading || !cr) {
    return <div className="max-w-7xl mx-auto px-6 py-10 text-slate-400 font-code text-sm">Loading…</div>;
  }

  const isOwnVendor = !isCustomer && user?.vendorOrgId === cr.vendorOrgId;
  const canEdit = isOwnVendor && (EDITABLE_STATUSES as readonly string[]).includes(cr.status);
  const canWithdraw = isOwnVendor && (WITHDRAWABLE_STATUSES as readonly string[]).includes(cr.status);
  const canDelete = isOwnVendor && cr.status === CRStatus.WITHDRAWN;
  const canDecide = isCustomer && (cr.status === CRStatus.SUBMITTED || cr.status === CRStatus.UNDER_REVIEW);
  const canImplement = (isCustomer || isOwnVendor) && (cr.status === CRStatus.APPROVED || cr.status === CRStatus.SCHEDULED);
  const canClose = isCustomer && cr.status === CRStatus.IMPLEMENTED;
  const risk = RISK_BADGE[cr.riskLevel as keyof typeof RISK_BADGE];

  async function submitEdit(values: CRFormValues) {
    setActionError(null);
    try {
      await api.changeRequests.update(cr.id, values);
      setEditing(false);
      invalidate();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Failed to save");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 pb-16">
      <button onClick={() => router.push("/change-requests")} className="text-xs text-slate-400 hover:text-primary font-code flex items-center gap-1 mb-4">
        <Icon name="arrow_back" className="text-[14px]" /> Change Requests
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-code text-[12px] font-semibold text-primary">{crCode(cr.id, cr.createdAt)}</span>
            {cr.vendorReference && (
              <span className="font-code text-[12px] font-semibold text-primary">· Ref: {cr.vendorReference}</span>
            )}
            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${risk.chip}`}>{risk.label} Risk</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGE[cr.status as CRStatus]}`}>
              {cr.status.replaceAll("_", " ")}
            </span>
          </div>
          <h1 className="text-2xl font-headline font-bold text-slate-900 tracking-tight">{cr.title}</h1>
          <p className="text-xs text-slate-500 font-code mt-1">
            {cr.vendorOrg.name} · submitted by {cr.submittedBy.name} · {formatDateTime(cr.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)} className="btn-secondary">
              Edit
            </button>
          )}
          {editing && (
            <button onClick={() => setEditing(false)} className="btn-secondary">
              Cancel edit
            </button>
          )}
          {canEdit && !editing && (
            <button onClick={() => runAction.mutate(() => api.changeRequests.submit(cr.id))} className="btn-primary">
              {cr.status === CRStatus.REJECTED ? "Resubmit" : "Submit for Review"}
            </button>
          )}
          {canWithdraw && (
            <button onClick={() => runAction.mutate(() => api.changeRequests.withdraw(cr.id))} className="btn-danger">
              Withdraw
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => {
                if (confirm("Permanently delete this withdrawn CR? This cannot be undone.")) {
                  runAction.mutate(() => api.changeRequests.remove(cr.id), {
                    onSuccess: () => router.push("/change-requests"),
                  });
                }
              }}
              className="btn-danger"
            >
              Delete
            </button>
          )}
          {canImplement && (
            <button onClick={() => runAction.mutate(() => api.changeRequests.markImplemented(cr.id))} className="btn-secondary">
              Mark Implemented
            </button>
          )}
          {canClose && (
            <button onClick={() => runAction.mutate(() => api.changeRequests.close(cr.id))} className="btn-secondary">
              Close CR
            </button>
          )}
          {canDecide && (
            <>
              <button
                onClick={() => runAction.mutate(() => api.changeRequests.decide(cr.id, "APPROVE", remark || undefined))}
                className="h-9 px-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5"
              >
                <Icon name="check" className="text-[16px]" /> Approve Request
              </button>
              <button
                onClick={() => runAction.mutate(() => api.changeRequests.decide(cr.id, "REJECT", remark || undefined))}
                className="h-9 px-4 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium flex items-center gap-1.5"
              >
                <Icon name="close" className="text-[16px]" /> Reject
              </button>
            </>
          )}
        </div>
      </div>

      {actionError && <p className="mb-4 text-sm text-rose-600">{actionError}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          {editing ? (
            <Card>
              <CRForm
                initial={{
                  title: cr.title,
                  description: cr.description,
                  riskLevel: cr.riskLevel,
                  rollbackPlan: cr.rollbackPlan,
                  plannedStart: cr.plannedStart,
                  plannedEnd: cr.plannedEnd,
                  systemAssetIds: cr.systemAssets.map((a: any) => a.id),
                  vendorReference: cr.vendorReference ?? undefined,
                }}
                excludeId={cr.id}
                submitLabel="Save changes"
                onSubmit={submitEdit}
              />
            </Card>
          ) : (
            <>
              <Card title="Scheduled Maintenance Window">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-md bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[10px] uppercase font-medium block">Execution Start</span>
                    <span className="font-code text-sm font-semibold text-slate-900 mt-0.5 block">{formatDateTime(cr.plannedStart)}</span>
                  </div>
                  <div className="p-3 rounded-md bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[10px] uppercase font-medium block">Target Completion</span>
                    <span className="font-code text-sm font-semibold text-slate-900 mt-0.5 block">{formatDateTime(cr.plannedEnd)}</span>
                  </div>
                </div>
              </Card>

              <Card title="Affected Systems & Asset Tags">
                <div className="flex flex-wrap gap-1.5">
                  {cr.systemAssets.map((a: any) => (
                    <span key={a.id} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-code text-[11px]">
                      {a.name}
                    </span>
                  ))}
                </div>
              </Card>

              <Card title="Executive Summary & Objective">
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{cr.description}</p>
              </Card>

              <Card title="Detailed Rollback Plan">
                <p className="text-sm text-slate-600 leading-relaxed font-code whitespace-pre-wrap">{cr.rollbackPlan}</p>
              </Card>

              <Attachments crId={cr.id} attachments={cr.attachments} onUploaded={invalidate} />
            </>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <AuditTrail entries={cr.auditLogs} />
          <Comments crId={cr.id} comments={cr.comments} comment={comment} setComment={setComment} onPosted={invalidate} />
        </div>
      </div>

      <style jsx global>{`
        .btn-primary {
          background: #0f2042;
          color: #fff;
          border-radius: 0.5rem;
          padding: 0.5rem 1.1rem;
          font-size: 0.75rem;
          font-weight: 500;
          transition: background 0.15s;
        }
        .btn-primary:hover {
          background: #1e293b;
        }
        .btn-secondary {
          border: 1px solid #e2e8f0;
          color: #334155;
          border-radius: 0.5rem;
          padding: 0.5rem 1.1rem;
          font-size: 0.75rem;
          font-weight: 500;
          transition: background 0.15s;
        }
        .btn-secondary:hover {
          background: #f1f5f9;
        }
        .btn-danger {
          border: 1px solid #fecdd3;
          color: #e11d48;
          border-radius: 0.5rem;
          padding: 0.5rem 1.1rem;
          font-size: 0.75rem;
          font-weight: 500;
          transition: background 0.15s;
        }
        .btn-danger:hover {
          background: #fff1f2;
        }
      `}</style>
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-lg p-5">
      {title && <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</h3>}
      {children}
    </div>
  );
}

function Attachments({ crId, attachments, onUploaded }: { crId: string; attachments: any[]; onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [demoFiles, setDemoFiles] = useState<{ filename: string; sizeBytes: number }[]>([]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (DEMO_MODE) {
      setDemoFiles((prev) => [...prev, { filename: file.name, sizeBytes: file.size }]);
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      await api.changeRequests.uploadAttachment(crId, file);
      onUploaded();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Verified Attachments ({attachments.length})</h3>
        <label className="text-[11px] font-medium text-primary cursor-pointer hover:underline flex items-center gap-1">
          <Icon name="upload_file" className="text-[14px]" />
          {uploading ? "Uploading…" : "Add file"}
          <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      </div>
      {DEMO_MODE && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mb-3">
          Demo environment — files you add here are shown in the list below but are not actually stored.
        </p>
      )}
      {attachments.length === 0 && demoFiles.length === 0 && <p className="text-sm text-slate-400">No attachments yet.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {attachments.map((a: any) => (
          <a
            key={a.id}
            href={api.changeRequests.attachmentDownloadUrl(crId, a.id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-100 rounded-md hover:border-slate-300 transition-colors"
          >
            <Icon name="description" className="text-slate-500 text-[18px]" />
            <div className="truncate">
              <span className="block text-xs font-medium text-slate-800 truncate">{a.filename}</span>
              <span className="block text-[10px] font-code text-slate-400">
                {(a.sizeBytes / 1024).toFixed(0)} KB · {a.uploadedBy.name}
              </span>
            </div>
          </a>
        ))}
        {demoFiles.map((f, i) => (
          <div key={i} className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-md">
            <Icon name="description" className="text-slate-400 text-[18px]" />
            <div className="truncate">
              <span className="block text-xs font-medium text-slate-600 truncate">{f.filename}</span>
              <span className="block text-[10px] font-code text-slate-400">{(f.sizeBytes / 1024).toFixed(0)} KB · not saved (demo)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Comments({
  crId,
  comments,
  comment,
  setComment,
  onPosted,
}: {
  crId: string;
  comments: any[];
  comment: string;
  setComment: (v: string) => void;
  onPosted: () => void;
}) {
  const [posting, setPosting] = useState(false);

  async function post() {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await api.changeRequests.addComment(crId, comment.trim());
      setComment("");
      onPosted();
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Discussion &amp; Inquiries</h3>
        <span className="text-[11px] text-slate-400">{comments.length} Messages</span>
      </div>
      <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
        {comments.length === 0 && <p className="text-sm text-slate-400">No messages yet.</p>}
        {comments.map((c: any) => (
          <div key={c.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-md">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[12px] font-semibold text-slate-900">{c.author.name}</span>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  c.author.role === "CUSTOMER" ? "bg-blue-50 text-blue-700" : "bg-teal-50 text-teal-700"
                }`}
              >
                {c.author.role === "CUSTOMER" ? "HTX" : "Vendor"}
              </span>
              <span className="text-[10px] text-slate-400 ml-auto">{formatDateTime(c.createdAt)}</span>
            </div>
            <p className="text-[13px] text-slate-600 whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <textarea
          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-[12px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 resize-none"
          placeholder="Add a technical note or reply…"
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button
          onClick={post}
          disabled={posting}
          className="w-full h-8 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-medium transition-colors"
        >
          Post
        </button>
      </div>
    </div>
  );
}

function AuditTrail({ entries }: { entries: any[] }) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Immutable Audit Trail</h3>
        <span className="text-[10px] font-code text-slate-400">GitLab SSO</span>
      </div>
      <div className="relative pl-4 space-y-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200 text-[12px] max-h-96 overflow-y-auto">
        {[...entries].reverse().map((e: any) => (
          <div key={e.id} className="relative">
            <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-white" />
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900">{e.actor.name}</span>
              <span className="text-[10px] text-slate-400">{formatDateTime(e.createdAt)}</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              {e.action.replaceAll("_", " ").toLowerCase()}
              {e.fromStatus && e.toStatus && (
                <span className="text-slate-400">
                  {" "}
                  ({e.fromStatus} → {e.toStatus})
                </span>
              )}
            </p>
            {e.remark && <p className="text-slate-500 text-[11px] italic mt-0.5">&ldquo;{e.remark}&rdquo;</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
