export enum OrgType {
  VENDOR = "VENDOR",
  HTX = "HTX",
}

export enum Role {
  VENDOR = "VENDOR",
  CUSTOMER = "CUSTOMER",
}

export enum CRStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  SCHEDULED = "SCHEDULED",
  IMPLEMENTED = "IMPLEMENTED",
  CLOSED = "CLOSED",
  WITHDRAWN = "WITHDRAWN",
}

// Statuses that still appear on the maintenance calendar.
export const CALENDAR_STATUSES = [CRStatus.APPROVED, CRStatus.SCHEDULED, CRStatus.IMPLEMENTED] as const;

// Statuses a vendor may still edit/withdraw the CR from.
export const EDITABLE_STATUSES = [CRStatus.DRAFT, CRStatus.REJECTED] as const;
export const WITHDRAWABLE_STATUSES = [CRStatus.DRAFT, CRStatus.SUBMITTED, CRStatus.UNDER_REVIEW] as const;

export enum RiskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export const STATUS_LABELS: Record<CRStatus, string> = {
  [CRStatus.DRAFT]: "Draft",
  [CRStatus.SUBMITTED]: "Submitted",
  [CRStatus.UNDER_REVIEW]: "Under Review",
  [CRStatus.APPROVED]: "Approved",
  [CRStatus.REJECTED]: "Rejected",
  [CRStatus.SCHEDULED]: "Scheduled",
  [CRStatus.IMPLEMENTED]: "Implemented",
  [CRStatus.CLOSED]: "Closed",
  [CRStatus.WITHDRAWN]: "Withdrawn",
};

export interface JwtUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  orgType: OrgType;
  vendorOrgId: string | null;
}
