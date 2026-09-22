import { CRStatus, RiskLevel, STATUS_LABELS } from "@cmp/shared";

export { STATUS_LABELS };

export const STATUS_BADGE: Record<CRStatus, string> = {
  [CRStatus.DRAFT]: "bg-slate-100 text-slate-600",
  [CRStatus.SUBMITTED]: "bg-blue-50 text-blue-700",
  [CRStatus.UNDER_REVIEW]: "bg-indigo-50 text-indigo-700",
  [CRStatus.APPROVED]: "bg-emerald-50 text-emerald-700",
  [CRStatus.REJECTED]: "bg-rose-50 text-rose-600",
  [CRStatus.SCHEDULED]: "bg-amber-50 text-amber-700",
  [CRStatus.IMPLEMENTED]: "bg-teal-50 text-teal-700",
  [CRStatus.CLOSED]: "bg-slate-100 text-slate-500",
  [CRStatus.WITHDRAWN]: "bg-slate-100 text-slate-400",
};

export const RISK_BADGE: Record<RiskLevel, { label: string; chip: string; dot: string }> = {
  [RiskLevel.LOW]: { label: "Low", chip: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" },
  [RiskLevel.MEDIUM]: { label: "Medium", chip: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500" },
  [RiskLevel.HIGH]: { label: "High", chip: "bg-rose-50 text-rose-600 border-rose-100", dot: "bg-rose-600" },
};

export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatShort(value: string | Date) {
  return new Date(value).toLocaleString("en-SG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export const ROLE_LABELS: Record<string, string> = {
  VENDOR: "Vendor",
  CUSTOMER: "Customer",
};

/** Deterministic display code (CR-<year>-<3 digits>) derived from a CR's id + createdAt,
 *  since the backend doesn't mint sequential ticket numbers — purely cosmetic. */
export function crCode(id: string, createdAt?: string | Date): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const num = 100 + (hash % 900);
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  return `CR-${year}-${num}`;
}
