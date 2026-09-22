const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** When true, file uploads are shown in the UI but never sent to the API —
 *  used for hosted demo/POC deployments with no durable file storage wired up. */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, Array.isArray(message) ? message.join(", ") : message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
const patch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined });
const del = <T>(path: string) => request<T>(path, { method: "DELETE" });

export const api = {
  authMode: () => get<{ mode: "mock" | "gitlab" }>("/auth/mode"),
  devUsers: () =>
    get<
      { id: string; name: string; email: string; role: string | null; orgType: string | null; vendorOrgName: string | null }[]
    >("/auth/dev-users"),
  devLogin: (userId: string) => post<{ user: unknown }>("/auth/dev-login", { userId }),
  me: () =>
    get<{
      user: import("@cmp/shared").JwtUser & { requestedVendorOrgId: string | null; requestedVendorOrgName: string | null };
    }>("/auth/me"),
  logout: () => post("/auth/logout"),
  gitlabLoginUrl: () => `${API_URL}/auth/gitlab`,
  requestVendor: (vendorOrgId: string) =>
    post<{ requestedVendorOrgId: string; requestedVendorOrgName: string }>("/auth/request-vendor", { vendorOrgId }),

  vendorOrgs: {
    list: () => get<{ id: string; name: string }[]>("/vendor-orgs"),
    create: (name: string) => post("/vendor-orgs", { name }),
  },

  systemAssets: {
    list: () => get<{ id: string; name: string; description: string | null }[]>("/system-assets"),
    create: (name: string, description?: string) => post("/system-assets", { name, description }),
    remove: (id: string) => del(`/system-assets/${id}`),
  },

  users: {
    list: () => get<any[]>("/users"),
    pending: () => get<any[]>("/users/pending"),
    assign: (id: string, dto: { role: string; orgType: string; vendorOrgId?: string }) =>
      patch(`/users/${id}/assign`, dto),
  },

  notifications: {
    list: () => get<any[]>("/notifications"),
    markRead: (id: string) => post(`/notifications/${id}/read`),
    markAllRead: () => post("/notifications/read-all"),
  },

  dashboard: () => get<any>("/dashboard"),

  changeRequests: {
    list: (params?: Record<string, string | undefined>) => {
      const qs = params
        ? "?" +
          Object.entries(params)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
            .join("&")
        : "";
      return get<any[]>(`/change-requests${qs}`);
    },
    get: (id: string) => get<any>(`/change-requests/${id}`),
    create: (dto: any) => post<any>("/change-requests", dto),
    update: (id: string, dto: any) => patch<any>(`/change-requests/${id}`, dto),
    submit: (id: string) => post<any>(`/change-requests/${id}/submit`),
    startReview: (id: string) => post<any>(`/change-requests/${id}/start-review`),
    decide: (id: string, decision: "APPROVE" | "REJECT", remark?: string) =>
      post<any>(`/change-requests/${id}/decision`, { decision, remark }),
    withdraw: (id: string) => post<any>(`/change-requests/${id}/withdraw`),
    markImplemented: (id: string) => post<any>(`/change-requests/${id}/implemented`),
    close: (id: string) => post<any>(`/change-requests/${id}/close`),
    addComment: (id: string, body: string) => post<any>(`/change-requests/${id}/comments`, { body }),
    conflicts: (dto: { systemAssetIds: string[]; plannedStart: string; plannedEnd: string; excludeId?: string }) =>
      post<any[]>("/change-requests/conflicts", dto),
    calendar: (from: string, to: string, vendorOrgId?: string) =>
      get<any[]>(
        `/change-requests/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${
          vendorOrgId ? `&vendorOrgId=${vendorOrgId}` : ""
        }`,
      ),
    uploadAttachment: async (id: string, file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<any>(`/change-requests/${id}/attachments`, { method: "POST", body: form });
    },
    attachmentDownloadUrl: (id: string, attachmentId: string) =>
      `${API_URL}/change-requests/${id}/attachments/${attachmentId}/download`,
  },
};
