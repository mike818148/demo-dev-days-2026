"use client";

import { useCallback, useEffect, useState } from "react";
import { getNonEmployees } from "@/lib/actions/nerm";
import type { NermProfile } from "@/lib/actions/nerm";
import { Users, RefreshCw, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { NermNonEmployeeDetails } from "./nerm-non-employee-details";


export function NermNonEmployees() {
  const [data, setData] = useState<NermProfile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsProfile, setDetailsProfile] = useState<NermProfile | null>(null);

  const loadData = useCallback(() => {
    setError(null);
    return getNonEmployees()
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load non-employees")
      );
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadData().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Non-Employees</h1>
        <p className="text-sm text-muted-foreground">View and manage non-employees.</p>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Non-Employees</h1>
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Non-Employees</h1>
            <p className="text-sm text-muted-foreground">View and manage non-employees.</p>
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No non-employees</EmptyTitle>
            <EmptyDescription>
              No non-employees found. Add one from New Non-Employees.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Non-Employees</h1>
          <p className="text-sm text-muted-foreground">View and manage non-employees.</p>
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Non-Employees</CardTitle>
          <p className="text-sm text-muted-foreground">{data.length} non-employee(s)</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{profile.name}</TableCell>
                  <TableCell className="text-muted-foreground">{profile.id}</TableCell>
                  <TableCell>
                    <Badge variant={profile.status === "Active" ? "default" : "secondary"}>
                      {profile.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {profile.updated_at
                      ? new Date(profile.updated_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailsProfile(profile)}
                      className="gap-1.5 font-medium"
                    >
                      <Eye className="h-4 w-4" />
                      See details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={detailsProfile !== null} onOpenChange={(open) => !open && setDetailsProfile(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto border-border/80 shadow-xl">
          {detailsProfile && <NermNonEmployeeDetails profile={detailsProfile} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
