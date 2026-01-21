"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Shield,
  Calendar,
  User,
  FileText,
  Tag,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { SodPolicyRead, IdentityDocument } from "sailpoint-api-client";
import { getPolicyViolatedIdentities, resolvePolicyViolationWithAI, isOpenAIAvailable } from "@/lib/actions/isc";
import { toast, Toaster } from "sonner";

const getStateColor = (state: string) => {
  const colors = {
    ENFORCED: "bg-success/10 text-success border-success/20",
    DRAFT: "bg-warning/10 text-warning border-warning/20",
    DISABLED: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
  };
  return (
    colors[state as keyof typeof colors] || "bg-muted text-muted-foreground"
  );
};

const getStateIcon = (state: string) => {
  switch (state) {
    case "ENFORCED":
      return <CheckCircle2 className="h-4 w-4" />;
    case "DRAFT":
      return <Clock className="h-4 w-4" />;
    case "DISABLED":
      return <XCircle className="h-4 w-4" />;
    default:
      return <Shield className="h-4 w-4" />;
  }
};

export function PolicyDetail({ policy }: { policy: SodPolicyRead }) {
  const [violatedIdentities, setViolatedIdentities] = useState<IdentityDocument[]>([]);
  const [isLoadingViolations, setIsLoadingViolations] = useState(false);
  const [processingIdentityId, setProcessingIdentityId] = useState<string | null>(null);
  const [openAIAvailable, setOpenAIAvailable] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultDialogTitle, setResultDialogTitle] = useState<string>("");
  const [resultDialogMessage, setResultDialogMessage] = useState<string>("");
  const [resultDialogIdentity, setResultDialogIdentity] =
    useState<IdentityDocument | null>(null);

  const loadViolatedIdentities = useCallback(async () => {
    if (!policy.id) return;

    setIsLoadingViolations(true);
    try {
      if (!policy.policyQuery) {
        setViolatedIdentities([]);
        return;
      }

      const result = await getPolicyViolatedIdentities(policy.policyQuery);
      if ("identities" in result) {
        setViolatedIdentities(result.identities);
      } else {
        toast.error(`Error loading violated identities: ${result.error}`);
      }
    } catch (error) {
      toast.error("Failed to load violated identities");
      console.error("Error loading violated identities:", error);
    } finally {
      setIsLoadingViolations(false);
    }
  }, [policy.id, policy.policyQuery]);

  useEffect(() => {
    loadViolatedIdentities();
  }, [loadViolatedIdentities]);

  useEffect(() => {
    const checkOpenAIAvailability = async () => {
      const available = await isOpenAIAvailable();
      setOpenAIAvailable(available);
    };
    checkOpenAIAvailability();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleIdentityAction = async (identity: IdentityDocument) => {
    if (!identity.id) {
      toast.error("Identity ID is required");
      return;
    }
    // If another identity is currently processing, ignore.
    if (processingIdentityId && processingIdentityId !== identity.id) {
      return;
    }

    setProcessingIdentityId(identity.id);
    setResultDialogIdentity(identity);
    setResultDialogTitle("Resolving policy violation");
    // Reset dialog content for a fresh run (prevents stale results flashing)
    setResultDialogMessage("");
    setResultDialogOpen(true);
    console.log("[PolicyDetail] Starting AI resolution for:", {
      policyId: policy.id,
      policyName: policy.name,
      identityId: identity.id,
      identityName: identity.name,
    });

    try {
      const result = await resolvePolicyViolationWithAI(policy, identity);

      if ("error" in result) {
        console.error("[PolicyDetail] Error resolving violation:", result.error);
        setResultDialogTitle("Policy violation resolution failed");
        setResultDialogMessage(result.error);
      } else {
        console.log("[PolicyDetail] Violation resolved successfully:", result.message);
        setResultDialogTitle("Policy violation resolution result");
        setResultDialogMessage(result.message);
      }
    } catch (error) {
      console.error("[PolicyDetail] Unexpected error:", error);
      setResultDialogTitle("Policy violation resolution failed");
      setResultDialogMessage(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setProcessingIdentityId(null);
    }
  };

  return (
    <>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-balance">
                  {policy.name}
                </h1>
                {policy.state && (
                  <Badge
                    variant="outline"
                    className={cn("border", getStateColor(policy.state))}
                  >
                    {getStateIcon(policy.state)}
                    <span className="ml-1.5">{policy.state}</span>
                  </Badge>
                )}
                {policy.type && (
                  <Badge variant="outline" className="border">
                    {policy.type}
                  </Badge>
                )}
              </div>
              {policy.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {policy.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <Tabs defaultValue="details" className="w-full">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="violations">Violated Identities</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-4 space-y-4">
                  {/* Basic Information */}
                  <Card>
                    <div className="p-6 space-y-4">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Basic Information
                      </h2>
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {policy.id && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Policy ID</p>
                            <p className="text-sm font-mono">{policy.id}</p>
                          </div>
                        )}
                        {policy.externalPolicyReference && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              External Reference
                            </p>
                            <p className="text-sm">{policy.externalPolicyReference}</p>
                          </div>
                        )}
                        {policy.ownerRef && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Owner
                            </p>
                            <p className="text-sm">{policy.ownerRef.name}</p>
                            {policy.ownerRef.id && (
                              <p className="text-xs text-muted-foreground font-mono mt-1">
                                {policy.ownerRef.id}
                              </p>
                            )}
                          </div>
                        )}
                        {policy.state && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">State</p>
                            <Badge
                              variant="outline"
                              className={cn("border", getStateColor(policy.state))}
                            >
                              {policy.state}
                            </Badge>
                          </div>
                        )}
                        {policy.type && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Type</p>
                            <Badge variant="outline" className="border">
                              {policy.type}
                            </Badge>
                          </div>
                        )}
                        {policy.scheduled !== undefined && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Scheduled</p>
                            <Badge
                              variant={policy.scheduled ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {policy.scheduled ? "Yes" : "No"}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Dates */}
                  <Card>
                    <div className="p-6 space-y-4">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Dates
                      </h2>
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {policy.created && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Created</p>
                            <p className="text-sm">{formatDate(policy.created)}</p>
                          </div>
                        )}
                        {policy.modified && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Modified</p>
                            <p className="text-sm">{formatDate(policy.modified)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Policy Query */}
                  {policy.policyQuery && (
                    <Card>
                      <div className="p-6 space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Policy Query
                        </h2>
                        <Separator />
                        <div className="bg-muted p-4 rounded-md">
                          <p className="text-sm font-mono break-all">
                            {policy.policyQuery}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Compensating Controls */}
                  {policy.compensatingControls && (
                    <Card>
                      <div className="p-6 space-y-4">
                        <h2 className="text-lg font-semibold">Compensating Controls</h2>
                        <Separator />
                        <p className="text-sm whitespace-pre-wrap">
                          {policy.compensatingControls}
                        </p>
                      </div>
                    </Card>
                  )}

                  {/* Correction Advice */}
                  {policy.correctionAdvice && (
                    <Card>
                      <div className="p-6 space-y-4">
                        <h2 className="text-lg font-semibold">Correction Advice</h2>
                        <Separator />
                        <p className="text-sm whitespace-pre-wrap">
                          {policy.correctionAdvice}
                        </p>
                      </div>
                    </Card>
                  )}

                  {/* Violation Owner Assignment Config */}
                  {policy.violationOwnerAssignmentConfig && (
                    <Card>
                      <div className="p-6 space-y-4">
                        <h2 className="text-lg font-semibold">
                          Violation Owner Assignment
                        </h2>
                        <Separator />
                        <div className="space-y-3">
                          {policy.violationOwnerAssignmentConfig.assignmentRule && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Assignment Rule
                              </p>
                              <Badge variant="outline" className="border">
                                {policy.violationOwnerAssignmentConfig.assignmentRule}
                              </Badge>
                            </div>
                          )}
                          {policy.violationOwnerAssignmentConfig.ownerRef && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Owner
                              </p>
                              <p className="text-sm">
                                {policy.violationOwnerAssignmentConfig.ownerRef.name}
                              </p>
                              {policy.violationOwnerAssignmentConfig.ownerRef.id && (
                                <p className="text-xs text-muted-foreground font-mono mt-1">
                                  {policy.violationOwnerAssignmentConfig.ownerRef.id}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Conflicting Access Criteria */}
                  {policy.conflictingAccessCriteria && (
                    <Card>
                      <div className="p-6 space-y-4">
                        <h2 className="text-lg font-semibold">
                          Conflicting Access Criteria
                        </h2>
                        <Separator />
                        <div className="space-y-6">
                          {policy.conflictingAccessCriteria.leftCriteria && (
                            <div>
                              <h3 className="text-sm font-semibold mb-3">
                                Left Criteria: {policy.conflictingAccessCriteria.leftCriteria.name}
                              </h3>
                              {policy.conflictingAccessCriteria.leftCriteria.criteriaList &&
                                policy.conflictingAccessCriteria.leftCriteria.criteriaList.length >
                                0 && (
                                  <div className="space-y-2">
                                    {policy.conflictingAccessCriteria.leftCriteria.criteriaList.map(
                                      (criteria, index) => (
                                        <div
                                          key={index}
                                          className="bg-muted p-3 rounded-md"
                                        >
                                          <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="text-xs">
                                              {criteria.type}
                                            </Badge>
                                            <span className="text-sm font-medium">
                                              {criteria.name}
                                            </span>
                                          </div>
                                          {criteria.id && (
                                            <p className="text-xs text-muted-foreground font-mono mt-1">
                                              {criteria.id}
                                            </p>
                                          )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                            </div>
                          )}
                          {policy.conflictingAccessCriteria.rightCriteria && (
                            <div>
                              <h3 className="text-sm font-semibold mb-3">
                                Right Criteria:{" "}
                                {policy.conflictingAccessCriteria.rightCriteria.name}
                              </h3>
                              {policy.conflictingAccessCriteria.rightCriteria.criteriaList &&
                                policy.conflictingAccessCriteria.rightCriteria.criteriaList.length >
                                0 && (
                                  <div className="space-y-2">
                                    {policy.conflictingAccessCriteria.rightCriteria.criteriaList.map(
                                      (criteria, index) => (
                                        <div
                                          key={index}
                                          className="bg-muted p-3 rounded-md"
                                        >
                                          <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="text-xs">
                                              {criteria.type}
                                            </Badge>
                                            <span className="text-sm font-medium">
                                              {criteria.name}
                                            </span>
                                          </div>
                                          {criteria.id && (
                                            <p className="text-xs text-muted-foreground font-mono mt-1">
                                              {criteria.id}
                                            </p>
                                          )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Tags */}
                  {policy.tags && policy.tags.length > 0 && (
                    <Card>
                      <div className="p-6 space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                          <Tag className="h-5 w-5" />
                          Tags
                        </h2>
                        <Separator />
                        <div className="flex flex-wrap gap-2">
                          {policy.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </Card>
                  )}
                </TabsContent>
                {/* Violated Identities */}
                <TabsContent value="violations" className="mt-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-sm text-muted-foreground">
                      {isLoadingViolations
                        ? "Refreshing…"
                        : `Found ${violatedIdentities.length} identity${violatedIdentities.length === 1 ? "" : "ies"
                        }`}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadViolatedIdentities}
                      disabled={isLoadingViolations}
                    >
                      Refresh
                    </Button>
                  </div>

                  {isLoadingViolations ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Loading violated identities...
                    </div>
                  ) : violatedIdentities.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No violated identities found.
                    </div>
                  ) : (
                    <div className="border rounded-md">

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Display Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Lifecycle State</TableHead>
                            {openAIAvailable && <TableHead>Action</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {violatedIdentities.map((identity) => (
                            <TableRow key={identity.id}>
                              <TableCell className="font-medium">
                                {identity.name || "N/A"}
                              </TableCell>
                              <TableCell>
                                {identity.displayName || "N/A"}
                              </TableCell>
                              <TableCell>
                                {identity.email || "N/A"}
                              </TableCell>
                              <TableCell>
                                {identity.status || "N/A"}
                              </TableCell>
                              {openAIAvailable && (
                                <TableCell>
                                  <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleIdentityAction(identity)}
                                      >
                                        Resolve Violation
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl">
                                      <DialogHeader>
                                        <DialogTitle>{resultDialogTitle}</DialogTitle>
                                        <DialogDescription>
                                          {resultDialogIdentity
                                            ? `Policy: ${policy.name} · Identity: ${resultDialogIdentity.name ?? "N/A"}`
                                            : policy.name}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="max-h-[60vh] overflow-auto rounded-md border bg-muted p-3 text-sm whitespace-pre-wrap break-words">
                                        {processingIdentityId ? (
                                          <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                              <span>Processing…</span>
                                            </div>
                                            {resultDialogMessage ? (
                                              <div>{resultDialogMessage}</div>
                                            ) : null}
                                          </div>
                                        ) : (
                                          resultDialogMessage || "No message returned."
                                        )}
                                      </div>
                                      <DialogFooter>
                                        <Button
                                          variant="default"
                                          onClick={() => setResultDialogOpen(false)}
                                        >
                                          Close
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>

                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </Card>
        </div>
      </div>
      <Toaster />
    </>
  );
}
