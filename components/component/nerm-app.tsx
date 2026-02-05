"use client";

import { useState } from "react";
import { Building2, Users, UserCircle } from "lucide-react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NermOrganization } from "@/components/component/nerm-organization";
import { NermNewOrganization } from "@/components/component/nerm-new-organization";
import { NermNonEmployees } from "@/components/component/nerm-non-employees";
import { NermNewNonEmployee } from "@/components/component/nerm-new-non-employee";

type NermSection =
  | "organization"
  | "new-organization"
  | "non-employees"
  | "new-non-employees";

const leftNavItems: { id: NermSection; label: string; icon: React.ReactNode }[] =
  [
    { id: "organization", label: "Organization", icon: <Building2 className="h-4 w-4" /> },
    {
      id: "new-organization",
      label: "New Organization",
      icon: <Building2 className="h-4 w-4" />,
    },
    { id: "non-employees", label: "Non-Employees", icon: <Users className="h-4 w-4" /> },
    {
      id: "new-non-employees",
      label: "New Non-Employees",
      icon: <UserCircle className="h-4 w-4" />,
    },
  ];

export function NermApp() {
  const [section, setSection] = useState<NermSection>("organization");

  return (
    <div className="h-[calc(100vh-2rem)] w-full min-h-[400px] rounded-lg border bg-background">
      <ResizablePanelGroup orientation="horizontal" className="h-full">
        <ResizablePanel
          defaultSize={22}
          className="flex flex-col"
        >
          <div className="flex flex-col gap-1 p-3">
            <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {"Non-Employee Management > Dashboard"}
            </h2>
            <nav className="flex flex-col gap-0.5">
              {leftNavItems.map((item) => (
                <Button
                  key={item.id}
                  variant={section === item.id ? "secondary" : "ghost"}
                  className={cn(
                    "justify-start gap-2 font-normal",
                    section === item.id && "bg-accent"
                  )}
                  onClick={() => setSection(item.id)}
                >
                  {item.icon}
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-border" />
        <ResizablePanel defaultSize={78} className="flex flex-col">
          <div className="flex h-full flex-col overflow-auto p-6">
            {section === "organization" && <NermOrganization />}
            {section === "new-organization" && <NermNewOrganization />}
            {section === "non-employees" && <NermNonEmployees />}
            {section === "new-non-employees" && <NermNewNonEmployee />}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function SectionContent({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
        Content for {title} will appear here.
      </div>
    </div>
  );
}
