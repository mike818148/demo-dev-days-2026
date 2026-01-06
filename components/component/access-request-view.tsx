"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AccessRequest {
  id: string;
  name: string;
  type: string;
  state: string;
  requestType: string;
  description?: string;
  privilegeLevel?: string;
  created: string;
  modified: string;
  cancelable: boolean;
  requester: { name: string; id: string; type: string };
  requestedFor: { name: string; id: string; type: string };
  approvalDetails?: Array<{
    status: string;
    scheme: string;
    currentOwner: { name: string; id: string; type: string };
    originalOwner?: { name: string; id: string; type: string };
    modified: string;
    forwarded: boolean;
    comment?: string;
  }>;
  manualWorkItemDetails?: Array<{
    status: string;
    currentOwner: { name: string; id: string; type: string };
    originalOwner?: { name: string; id: string; type: string };
    modified: string;
    forwarded: boolean;
    forwardHistory?: Array<{
      oldApproverName: string;
      newApproverName: string;
      comment: string;
      modified: string;
      forwarderName: string;
      reassignmentType: string;
    }>;
  }>;
  accessRequestPhases?: Array<{
    name: string;
    state: string;
    result?: string;
    started: string;
    finished?: string;
  }>;
  sodViolationContext?: {
    state: string;
    violationCheckResult?: {
      violatedPolicies?: Array<{ name: string; id: string }>;
      violationContexts?: Array<{
        policy: { name: string };
        conflictingAccessCriteria?: any;
      }>;
    };
  };
  errorMessages?: Array<{ text: string; locale: string }>;
  cancelledRequestDetails?: {
    comment: string;
    owner: { name: string };
    modified: string;
  };
  requesterComment?: {
    comment: string;
    author: { name: string };
    created: string;
  };
}

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
      return <XCircle className="h-4 w-4" />;
    case "PENDING":
    case "EXECUTING":
      return <Clock className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
};

export function AccessRequestView({ request }: { request: AccessRequest }) {
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
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
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
                className={cn("border", getStateColor(request.state))}
              >
                {getStateIcon(request.state)}
                <span className="ml-1.5">{request.state}</span>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Request ID: <span className="font-mono">{request.id}</span>
            </p>
          </div>
          {request.privilegeLevel && (
            <Badge variant="secondary" className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              {request.privilegeLevel} Privilege
            </Badge>
          )}
        </div>
        {request.description && (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            {request.description}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Request Details */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Request Details
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Request Type
                </p>
                <p className="text-sm font-medium">
                  {request.requestType.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Type</p>
                <p className="text-sm font-medium">
                  {request.type.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="text-sm font-medium">
                  {formatDate(request.created)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Last Modified
                </p>
                <p className="text-sm font-medium">
                  {formatDate(request.modified)}
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
                          getStateColor(approval.status)
                        )}
                      >
                        {getStateIcon(approval.status)}
                      </div>
                      {index < request.approvalDetails!.length - 1 && (
                        <div className="h-full w-px bg-border my-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {approval.currentOwner.name}
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
                            approval.originalOwner.id !==
                              approval.currentOwner.id && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                Originally: {approval.originalOwner.name}
                                <ArrowRight className="h-3 w-3" />
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
                            getStateColor(approval.status)
                          )}
                        >
                          {approval.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(approval.modified)}
                      </p>
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
                            {item.currentOwner.name}
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
                                      {formatDate(fwd.modified)}
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
                          className={cn("border", getStateColor(item.status))}
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <Separator />
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
                            getStateColor(phase.state)
                          )}
                        >
                          {getStateIcon(phase.state)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {phase.name.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(phase.started)}
                            {phase.finished &&
                              ` → ${formatDate(phase.finished)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {phase.result && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "border",
                              getStateColor(phase.result)
                            )}
                          >
                            {phase.result}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={cn("border", getStateColor(phase.state))}
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
          {request.sodViolationContext?.violationCheckResult
            ?.violatedPolicies &&
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
                      <strong>Status:</strong>{" "}
                      {request.sodViolationContext.state}
                    </p>
                  </div>
                </div>
              </Card>
            )}

          {/* Error Messages */}
          {request.errorMessages && request.errorMessages.length > 0 && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {request.errorMessages.map((error, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-destructive/20 bg-background p-3 overflow-hidden"
                    >
                      <p className="text-sm whitespace-pre-wrap break-all">
                        {error.text}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 break-all">
                        Locale: {error.locale}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Participants */}
          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Participants
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Requester</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {request.requester.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {request.requester.type}
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Requested For
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                    <User className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {request.requestedFor.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {request.requestedFor.type}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Comments */}
          {request.requesterComment && (
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments
              </h2>
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium mb-1">
                    {request.requesterComment.author.name}
                  </p>
                  <p className="text-sm leading-relaxed">
                    {request.requesterComment.comment}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDate(request.requesterComment.created)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Cancellation Details */}
          {request.cancelledRequestDetails && (
            <Card className="p-6 border-destructive/20 bg-destructive/5">
              <h2 className="mb-4 text-sm font-semibold text-destructive uppercase tracking-wide">
                Cancelled
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Cancelled By
                  </p>
                  <p className="text-sm font-medium">
                    {request.cancelledRequestDetails.owner.name}
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
                    {formatDate(request.cancelledRequestDetails.modified)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Quick Actions
            </h2>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between p-3 text-sm rounded-lg border bg-background hover:bg-accent transition-colors">
                <span>View Full History</span>
                <ChevronRight className="h-4 w-4" />
              </button>
              <button className="w-full flex items-center justify-between p-3 text-sm rounded-lg border bg-background hover:bg-accent transition-colors">
                <span>Export Details</span>
                <ChevronRight className="h-4 w-4" />
              </button>
              {request.cancelable && (
                <button className="w-full flex items-center justify-between p-3 text-sm rounded-lg border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-colors">
                  <span>Cancel Request</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
