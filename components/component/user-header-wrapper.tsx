"use client";

import { useSession } from "next-auth/react";
import { UserHeader } from "./user-header";

export function UserHeaderWrapper() {
  const { data: session, status } = useSession();

  // Don't render until session is loaded
  if (status === "loading") {
    return null;
  }

  if (!session?.user) {
    return null;
  }

  return (
    <UserHeader name={session.user.name!} email={session.user.email!} />
  );
}

