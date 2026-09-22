"use client";

import { useQuery } from "@tanstack/react-query";
import type { JwtUser } from "@cmp/shared";
import { api, ApiError } from "./api";

export function useCurrentUser() {
  const query = useQuery<{ user: JwtUser }, ApiError>({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false,
  });

  const user = query.data?.user ?? null;
  const isPendingAccess = !!user && (!user.role || !user.orgType);
  const isCustomer = user?.role === "CUSTOMER";
  const isVendor = user?.role === "VENDOR";

  return { user, isCustomer, isVendor, ...query, isPendingAccess };
}
