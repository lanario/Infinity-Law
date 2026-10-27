"use client";

import { createContext, useContext } from "react";
import type { UserWithPermissions } from "@/types/permissions";

export const UserContext = createContext<UserWithPermissions | null>(null);

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({
  user,
  children,
}: {
  user: UserWithPermissions;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
