"use client";

import { useEffect, useState, useMemo } from "react";
import Timer from "antd/es/statistic/Timer";
import { getAttributes, type NermProfile } from "@/lib/actions/nerm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Layers, Clock, CalendarCheck, CalendarX, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

/** Parse date string in mm/dd/yyyy format. */
function parseMmDdYyyy(value: string | undefined): number | null {
  if (value == null || value === "") return null;
  const s = value.trim();
  const parts = s.split("/");
  if (parts.length !== 3) return null;
  const month = parseInt(parts[0], 10) - 1;
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(year)) return null;
  const d = new Date(year, month, day);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

const START_DATE_KEY = "nerm_core_assignment_start_date";
const END_DATE_KEY = "nerm_core_assignment_end_date";

function getCountdownState(assignment: NermProfile): {
  kind: "until_start" | "until_end" | "ended";
  targetMs: number;
} | null {
  const start = parseMmDdYyyy(assignment.attributes?.[START_DATE_KEY]);
  const end = parseMmDdYyyy(assignment.attributes?.[END_DATE_KEY]);
  const now = Date.now();
  if (start != null && now < start) {
    return { kind: "until_start", targetMs: start };
  }
  if (end != null && now < end) {
    return { kind: "until_end", targetMs: end };
  }
  if (end != null && now >= end) {
    return { kind: "ended", targetMs: end };
  }
  return null;
}

interface NermAssignmentsDetailsProps {
  assignment: NermProfile;
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

/** Displays full details of a single assignment (profile fields + attributes with labels). */
export function NermAssignmentsDetails({ assignment }: NermAssignmentsDetailsProps) {
  const [attributesMap, setAttributesMap] = useState<Record<string, string> | null>(null);
  const attributeUids = Object.keys(assignment.attributes ?? {});

  useEffect(() => {
    getAttributes(attributeUids).then(setAttributesMap);
  }, [assignment.id, attributeUids.length]);

  const profileEntries = (Object.entries(assignment) as [keyof NermProfile, string][]).filter(
    ([key]) => key !== "attributes"
  );
  const attributeEntries = Object.entries(assignment.attributes ?? {});

  const countdown = useMemo(() => getCountdownState(assignment), [assignment]);

  return (
    <Card className="border-border/80 bg-muted/20">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{assignment.name || assignment.uid || "Assignment"}</CardTitle>
          {assignment.status && (
            <Badge variant={assignment.status === "Active" ? "default" : "secondary"}>
              {assignment.status}
            </Badge>
          )}
        </div>
        {assignment.uid && (
          <p className="text-xs text-muted-foreground font-mono">{assignment.uid}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Timeline / countdown: always show so the section is visible */}
        <section className="rounded-md border border-border/60 bg-background/50 p-3" aria-label="Assignment timeline">
          {countdown == null && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="h-5 w-5 shrink-0" />
              <span>No start or end date set for this assignment.</span>
            </div>
          )}
          {countdown?.kind === "until_start" && (
            <div className="flex flex-wrap items-center gap-4">
              <Clock className="h-5 w-5 shrink-0 text-muted-foreground" />
              <Timer
                title="Days until start"
                value={countdown.targetMs}
                type="countdown"
                format="D [days] HH:mm:ss"
              />
            </div>
          )}
          {countdown?.kind === "until_end" && (
            <div className="flex flex-wrap items-center gap-4">
              <CalendarCheck className="h-5 w-5 shrink-0 text-muted-foreground" />
              <Timer
                title="Days until end"
                value={countdown.targetMs}
                type="countdown"
                format="D [days] HH:mm:ss"
              />
            </div>
          )}
          {countdown?.kind === "ended" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarX className="h-4 w-4 shrink-0" />
              <span>Assignment ended</span>
            </div>
          )}
        </section>
        <section>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="h-4 w-4" />
            Profile
          </h4>
          <dl className="grid gap-2 text-sm">
            {profileEntries.map(([key, value]) => (
              <div
                key={key}
                className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <dt className="font-medium text-muted-foreground">{formatKey(key)}</dt>
                <dd className={cn("break-all text-foreground", value && value.length > 40 && "text-xs")}>
                  {formatValue(key, value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        {attributeEntries.length > 0 && (
          <section>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Layers className="h-4 w-4" />
              Attributes
            </h4>
            <dl className="grid gap-2 text-sm">
              {attributeEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <dt className="font-medium text-muted-foreground">
                    {attributesMap?.[key] ?? key}
                  </dt>
                  <dd className={cn("break-all text-foreground", value && value.length > 40 && "text-xs")}>
                    {value ?? "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
