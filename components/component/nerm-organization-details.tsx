"use client";

import { useEffect, useState } from "react";
import { getAttributes, type NermProfile } from "@/lib/actions/nerm";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, FileText, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface NermOrganizationDetailsProps {
  profile: NermProfile;
}

const DATE_KEYS = new Set(["created_at", "updated_at"]);

function formatKey(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatValue(key: string, value: string | undefined): string {
  if (value == null || value === "") return "—";
  if (DATE_KEYS.has(key)) {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
  return value;
}

export function NermOrganizationDetails({ profile }: NermOrganizationDetailsProps) {
  const [attributesMap, setAttributesMap] = useState<Record<string, string> | null>(null);

  const attributeUids = Object.keys(profile.attributes ?? {});

  useEffect(() => {
    getAttributes(attributeUids).then((map) => {
      console.log("[NERM] attributesMap loaded", { count: Object.keys(map).length, map });
      setAttributesMap(map);
    });
  }, [profile.id, attributeUids.length]); // refetch when profile or attribute set changes

  const profileEntries = (Object.entries(profile) as [keyof NermProfile, string][]).filter(
    ([key]) => key !== "attributes"
  );
  const attributeEntries = Object.entries(profile.attributes ?? {});

  return (
    <>
      <DialogHeader className="space-y-3 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <DialogTitle className="text-xl tracking-tight">
              Organization: {profile.name || profile.uid || "Organization details"}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs">{profile.id}</span>
              {profile.status && (
                <Badge
                  variant={profile.status === "Active" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {profile.status}
                </Badge>
              )}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="grid gap-4 pt-2">
        <Card className="border-border/80 bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <dl className="grid gap-3 text-sm">
              {profileEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <dt className="font-medium text-muted-foreground">
                    {formatKey(key)}
                  </dt>
                  <dd
                    className={cn(
                      "break-all text-foreground",
                      value && value.length > 40 && "text-xs"
                    )}
                  >
                    {formatValue(key, value)}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        {attributeEntries.length > 0 && (
          <Card className="border-border/80 bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Layers className="h-4 w-4" />
                Attributes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <dl className="grid gap-3 text-sm">
                {attributeEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <dt className="font-medium text-muted-foreground">
                      {attributesMap?.[key] ?? key}
                    </dt>
                    <dd
                      className={cn(
                        "break-all text-foreground",
                        value && value.length > 40 && "text-xs"
                      )}
                    >
                      {value ?? "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
