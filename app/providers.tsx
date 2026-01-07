"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/providers/theme-provider";
import { UserHeaderWrapper } from "@/components/component/user-header-wrapper";

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div className="flex flex-col min-h-screen">
          <UserHeaderWrapper />
          <div className="flex-1 bg-background">{children}</div>
        </div>
      </ThemeProvider>
    </SessionProvider>
  );
}
