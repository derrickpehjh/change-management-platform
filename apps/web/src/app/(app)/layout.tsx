"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { TopNav } from "@/components/TopNav";
import { api } from "@/lib/api";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isPendingAccess, isLoading, isError } = useCurrentUser();

  useEffect(() => {
    if (isLoading) return;
    if (!user || isError) router.replace("/login");
  }, [user, isLoading, isError, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400 font-code text-sm bg-surface-canvas">
        Loading…
      </div>
    );
  }

  if (isPendingAccess) {
    return <PendingAccessScreen name={user.name} requestedVendorOrgName={user.requestedVendorOrgName} />;
  }

  return (
    <div className="min-h-screen bg-surface-canvas">
      <TopNav />
      <main className="w-full pt-14 pb-12">{children}</main>
    </div>
  );
}

function PendingAccessScreen({
  name,
  requestedVendorOrgName,
}: {
  name: string;
  requestedVendorOrgName: string | null;
}) {
  const queryClient = useQueryClient();
  const { data: vendorOrgs, isLoading: loadingOrgs } = useQuery({
    queryKey: ["vendor-orgs"],
    queryFn: api.vendorOrgs.list,
    enabled: !requestedVendorOrgName,
  });
  const [vendorOrgId, setVendorOrgId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!vendorOrgId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.requestVendor(vendorOrgId);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center px-4 bg-surface-canvas">
      <div className="max-w-md w-full text-center bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <p className="font-code text-xs uppercase tracking-wide text-amber-600 mb-3">Pending access</p>
        <h1 className="font-headline text-2xl font-bold text-slate-900 mb-2">Almost there, {name.split(" ")[0]}</h1>

        {requestedVendorOrgName ? (
          <p className="text-sm text-slate-500">
            Your request to join <span className="font-medium text-slate-700">{requestedVendorOrgName}</span> has
            been submitted. A customer admin still needs to approve it before you can use the platform.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-5">
              Your GitLab account has been recognised. Select the vendor company you represent so a customer admin
              can review and approve your access. If you're joining on behalf of HTX, reach out to your HTX contact
              directly instead.
            </p>
            <div className="text-left space-y-3">
              <select
                value={vendorOrgId}
                onChange={(e) => setVendorOrgId(e.target.value)}
                disabled={loadingOrgs}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
              >
                <option value="">{loadingOrgs ? "Loading vendors…" : "Select your vendor company"}</option>
                {vendorOrgs?.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <button
                onClick={submit}
                disabled={!vendorOrgId || submitting}
                className="w-full rounded-md bg-primary hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-3 py-2 transition-colors"
              >
                {submitting ? "Submitting…" : "Request access"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
