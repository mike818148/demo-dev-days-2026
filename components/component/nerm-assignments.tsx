"use client";

import { useState, useMemo, useEffect } from "react";
import type { NermProfile } from "@/lib/actions/nerm";
import { NermAssignmentsDetails } from "@/components/component/nerm-assignments-details";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

interface NermAssignmentsProps {
  assignments: NermProfile[];
}

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

/** Current calendar year range (Jan 1 00:00 to Dec 31 23:59:59). */
function getCalendarYearRange(): { rangeStart: number; rangeEnd: number; span: number } {
  const year = new Date().getFullYear();
  const rangeStart = new Date(year, 0, 1).getTime();
  const rangeEnd = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
  return { rangeStart, rangeEnd, span: rangeEnd - rangeStart };
}

export function NermAssignments({ assignments }: NermAssignmentsProps) {
  const [selected, setSelected] = useState<NermProfile | null>(null);

  useEffect(() => {
    if (assignments.length === 1) {
      setSelected(assignments[0]);
    } else if (assignments.length === 0) {
      setSelected(null);
    }
  }, [assignments]);

  const { rangeStart, rangeEnd, span, rows, todayPct } = useMemo(() => {
    const { rangeStart: yearStart, rangeEnd: yearEnd, span } = getCalendarYearRange();

    const rowList: { assignment: NermProfile; jobTitle: string; start: number; end: number }[] = [];
    for (const a of assignments) {
      const jobTitle = a.attributes?.job_title?.trim() || a.name || a.uid || "—";
      const start = parseMmDdYyyy(a.attributes?.[START_DATE_KEY]);
      const end = parseMmDdYyyy(a.attributes?.[END_DATE_KEY]);
      const startMs = start ?? yearStart;
      const endMs = end ?? startMs + 86400000;
      rowList.push({
        assignment: a,
        jobTitle,
        start: startMs,
        end: endMs,
      });
    }

    const today = Date.now();
    const todayPct =
      today >= yearStart && today <= yearEnd
        ? ((today - yearStart) / span) * 100
        : null;

    return {
      rangeStart: yearStart,
      rangeEnd: yearEnd,
      span,
      todayPct,
      rows: rowList.map((r) => {
        const barStart = Math.max(r.start, yearStart);
        const barEnd = Math.min(r.end, yearEnd);
        const leftPct = ((barStart - yearStart) / span) * 100;
        const widthPct = Math.max(0, ((barEnd - barStart) / span) * 100);
        return {
          ...r,
          leftPct,
          widthPct,
        };
      }),
    };
  }, [assignments]);

  const formatAxisDate = (ms: number) =>
    new Date(ms).toLocaleDateString(undefined, { month: "short", year: "2-digit" });

  if (assignments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No assignments to display.</p>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/80 bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ClipboardList className="h-4 w-4" />
            Gantt chart
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <div className="min-w-[400px]">
              {/* X-axis: current calendar year */}
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>{formatAxisDate(rangeStart)}</span>
                <span>{formatAxisDate(rangeEnd)}</span>
              </div>
              {/* Timeline area: today line (in bar area) + rows */}
              <div className="relative space-y-2">
                {todayPct != null && (
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-primary"
                    style={{ left: `calc(8rem + (100% - 8rem) * ${todayPct} / 100)` }}
                    title="Today"
                  />
                )}
                <div className="space-y-2">
                  {rows.map(({ assignment, jobTitle, leftPct, widthPct }) => (
                    <div
                      key={assignment.id}
                      className="flex items-center gap-3"
                    >
                      <div className="w-32 shrink-0 truncate text-sm font-medium" title={jobTitle}>
                        {jobTitle}
                      </div>
                      <div className="relative h-8 flex-1 rounded bg-muted/50">
                        <button
                          type="button"
                          onClick={() => setSelected(assignment)}
                          className={cn(
                            "absolute top-1 bottom-1 rounded bg-primary/80 hover:bg-primary transition-colors",
                            selected?.id === assignment.id && "ring-2 ring-primary ring-offset-2"
                          )}
                          style={{
                            left: `${Math.max(0, leftPct)}%`,
                            width: `${Math.min(100 - leftPct, widthPct)}%`,
                          }}
                          title={`${jobTitle} – click for details`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selected && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">Assignment details</h4>
          <NermAssignmentsDetails assignment={selected} />
        </div>
      )}
    </div>
  );
}
