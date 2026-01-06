"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  MessageSquare,
  ArrowRight,
  Shield,
  FileText,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RequestedItemStatus } from "sailpoint-api-client";
import { cancelAccessRequest } from "@/lib/actions/isc";
import { toast } from "sonner";

const getStateColor = (state: string) => {
  const colors = {
    EXECUTING: "bg-primary/10 text-primary border-primary/20",
    PENDING: "bg-warning/10 text-warning border-warning/20",
    COMPLETED: "bg-success/10 text-success border-success/20",
    SUCCESSFUL: "bg-success/10 text-success border-success/20",
    FAILED: "bg-destructive/10 text-destructive border-destructive/20",
    CANCELLED:
      "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
    APPROVED: "bg-success/10 text-success border-success/20",
    REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    colors[state as keyof typeof colors] || "bg-muted text-muted-foreground"
  );
};

const getStateIcon = (state: string) => {
  switch (state) {
    case "COMPLETED":
    case "SUCCESSFUL":
    case "APPROVED":
      return <CheckCircle2 className="h-4 w-4" />;
    case "FAILED":
    case "REJECTED":
    case "NOT_ALL_ITEMS_PROVISIONED":
      return <XCircle className="h-4 w-4" />;
    case "PENDING":
    case "EXECUTING":
      return <Clock className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
};

export function AccessRequestDetail({
  request,
}: {
  request: RequestedItemStatus;
}) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-balance">
                {request.name}
              </h1>
              <Badge
                variant="outline"
                className={cn("border", getStateColor(request.state ?? ""))}
              >
                {getStateIcon(request.state ?? "")}
                <span className="ml-1.5">{request.state}</span>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Request ID:{" "}
              <span className="font-mono">{request.accessRequestId}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {request.privilegeLevel && (
              <Badge variant="secondary" className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                {request.privilegeLevel} Privilege
              </Badge>
            )}
            {request.cancelable && request.state !== "CANCELLED" && (
              <Button
                variant="destructive"
                size="sm"
                disabled={isCancelling}
                onClick={async () => {
                  setIsCancelling(true);
                  try {
                    const result = await cancelAccessRequest(
                      request.accessRequestId ?? "",
                      "Cancelled by user"
                    );
                    if ("success" in result) {
                      toast.success("Request cancelled successfully", {
                        description:
                          "Request will be cancelled in a few minutes.",
                      });
                      // Refresh the page after successful cancellation
                      setTimeout(() => {
                        router.refresh();
                        window.location.reload();
                      }, 1000);
                    } else {
                      toast.error(result.error || "Failed to cancel request", {
                        description: "Please try again later.",
                      });
                    }
                  } catch (error) {
                    toast.error("Failed to cancel request", {
                      description: "Please try again later.",
                    });
                  } finally {
                    setIsCancelling(false);
                  }
                }}
                className="flex items-center gap-2"
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Cancel Request
              </Button>
            )}
          </div>
        </div>
        {request.description && (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            {request.description}
          </p>
        )}
      </div>

      <div className="space-y-6">
        {/* Request Details */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Request Details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Requester</p>
              <p className="text-sm font-medium">{request.requester?.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Requested For
              </p>
              <p className="text-sm font-medium">
                {request.requestedFor?.name}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Request Type</p>
              <p className="text-sm font-medium">
                {request.requestType?.replace(/_/g, " ")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Type</p>
              <p className="text-sm font-medium">
                {request.type?.replace(/_/g, " ")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm font-medium">
                {formatDate(request.created ?? "")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Last Modified
              </p>
              <p className="text-sm font-medium">
                {formatDate(request.modified ?? "")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Cancelable</p>
              <p className="text-sm font-medium">
                {request.cancelable ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </Card>

        {/* Approval Workflow */}
        {request.approvalDetails && request.approvalDetails.length > 0 && (
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              Approval Workflow
            </h2>
            <div className="space-y-4">
              {request.approvalDetails.map((approval, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border-2",
                        getStateColor(approval.status ?? "")
                      )}
                    >
                      {getStateIcon(approval.status ?? "")}
                    </div>
                    {index < request.approvalDetails!.length - 1 && (
                      <div className="h-full w-px bg-border my-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-4 pt-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {approval.currentOwner?.name ||
                              approval.originalOwner?.name}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {approval.scheme}
                          </Badge>
                          {approval.forwarded && (
                            <Badge variant="secondary" className="text-xs">
                              Forwarded
                            </Badge>
                          )}
                        </div>
                        {approval.originalOwner &&
                          approval.currentOwner &&
                          approval.originalOwner.id !==
                            approval.currentOwner.id && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              Originally: {approval.originalOwner.name}
                              <ArrowRight className="h-3 w-3" />
                              {approval.currentOwner.name}
                            </p>
                          )}
                        {approval.comment && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            &quot;{approval.comment}&quot;
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border",
                          getStateColor(approval.status ?? "")
                        )}
                      >
                        {approval.status}
                      </Badge>
                    </div>
                    {approval.modified && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(approval.modified)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Manual Work Items */}
        {request.manualWorkItemDetails &&
          request.manualWorkItemDetails.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                Manual Work Items
              </h2>
              <div className="space-y-4">
                {request.manualWorkItemDetails.map((item, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {item.currentOwner?.name}
                        </p>
                        {item.forwarded &&
                          item.forwardHistory &&
                          item.forwardHistory.length > 0 && (
                            <div className="mt-2 space-y-2">
                              <p className="text-xs text-muted-foreground font-medium">
                                Forward History:
                              </p>
                              {item.forwardHistory.map((fwd, fIdx) => (
                                <div
                                  key={fIdx}
                                  className="ml-3 border-l-2 border-muted pl-3 py-1"
                                >
                                  <p className="text-xs">
                                    <span className="font-medium">
                                      {fwd.oldApproverName}
                                    </span>
                                    <ArrowRight className="inline h-3 w-3 mx-1" />
                                    <span className="font-medium">
                                      {fwd.newApproverName}
                                    </span>
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    By {fwd.forwarderName} •{" "}
                                    {formatDate(fwd.modified ?? "")}
                                  </p>
                                  {fwd.comment && (
                                    <p className="text-xs text-muted-foreground italic mt-1">
                                      &quot;{fwd.comment}&quot;
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border",
                          getStateColor(item.status ?? "")
                        )}
                      >
                        {item.status}
                      </Badge>
                    </div>
                    {index < request.manualWorkItemDetails!.length - 1 && (
                      <Separator />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

        {/* Access Request Phases */}
        {request.accessRequestPhases &&
          request.accessRequestPhases.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                Request Phases
              </h2>
              <div className="space-y-3">
                {request.accessRequestPhases.map((phase, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full",
                          getStateColor(phase.state ?? "")
                        )}
                      >
                        {getStateIcon(phase.state ?? "")}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {phase.name?.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(phase.started ?? "")}
                          {phase.finished && ` → ${formatDate(phase.finished)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {phase.result && (
                        <Badge
                          variant="outline"
                          className={cn("border", getStateColor(phase.result))}
                        >
                          {phase.result}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          "border",
                          getStateColor(phase.state ?? "")
                        )}
                      >
                        {phase.state}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

        {/* SOD Violations */}
        {request.sodViolationContext?.violationCheckResult?.violatedPolicies &&
          request.sodViolationContext.violationCheckResult.violatedPolicies
            .length > 0 && (
            <Card className="p-6 border-destructive/20 bg-destructive/5">
              <h2 className="mb-4 text-lg font-semibold flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                SOD Violations Detected
              </h2>
              <div className="space-y-3">
                {request.sodViolationContext.violationCheckResult.violatedPolicies.map(
                  (policy, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-destructive/20 bg-background p-4"
                    >
                      <div className="flex items-start gap-3">
                        <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{policy.name}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            {policy.id}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}
                <div className="mt-3 rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Status:</strong> {request.sodViolationContext.state}
                  </p>
                </div>
              </div>
            </Card>
          )}

        {/* Error Messages */}
        {request.errorMessages && request.errorMessages.length > 0 && (
          <Card className="p-6 border-destructive/20 bg-destructive/5">
            <h2 className="mb-4 text-lg font-semibold flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Errors
            </h2>
            <div className="space-y-2">
              {request.errorMessages.flat().map((error, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-destructive/20 bg-background p-3 overflow-hidden"
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {error.text}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Comments */}
        {request.requesterComment && (
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              Comments
            </h2>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-xs font-medium mb-2">
                {request.requesterComment.author?.name}
              </p>
              <p className="text-sm leading-relaxed">
                {request.requesterComment.comment}
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                {formatDate(request.requesterComment.created ?? "")}
              </p>
            </div>
          </Card>
        )}

        {/* Cancellation Details */}
        {request.cancelledRequestDetails && (
          <Card className="p-6 border-destructive/20 bg-destructive/5">
            <h2 className="mb-4 text-lg font-semibold text-destructive">
              Cancellation Details
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Cancelled By
                </p>
                <p className="text-sm font-medium">
                  {request.cancelledRequestDetails.owner?.name}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Reason</p>
                <p className="text-sm">
                  {request.cancelledRequestDetails.comment}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Date</p>
                <p className="text-sm">
                  {formatDate(request.cancelledRequestDetails.modified ?? "")}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
