"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Loader2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Copy,
  ChevronRight,
  Zap,
  Users,
  Code,
  Info,
  ExternalLink,
} from "lucide-react";
import { SodPolicyRead, IdentityDocument } from "sailpoint-api-client";
import {
  resolvePolicyViolationWithAI,
  isOpenAIAvailable,
} from "@/lib/actions/isc";
import { toast } from "sonner";

const stateConfig = {
  ENFORCED: {
    color:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: CheckCircle2,
    label: "Enforced",
  },
  ENFORCED_WITH_VIOLATIONS: {
    color:
      "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    icon: AlertTriangle,
    label: "Enforced with Violations",
  },
  NOT_ENFORCED: {
    color:
      "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20",
    icon: XCircle,
    label: "Disabled",
  },
};

const getStateConfig = (state: string, hasViolations = false) => {
  if (state === "ENFORCED" && hasViolations) {
    return stateConfig.ENFORCED_WITH_VIOLATIONS;
  }

  return (
    stateConfig[state as keyof typeof stateConfig] || stateConfig.NOT_ENFORCED
  );
};

const formatPolicyType = (type: string) => {
  if (type === "CONFLICTING_ACCESS_BASED") {
    return "SOD";
  }
  return type;
};

interface PolicyDetailProps {
  policy: SodPolicyRead;
  violatedIdentities: IdentityDocument[];
  isLoadingViolations: boolean;
  onRefreshViolatedIdentities?: () => void;
}

const AI_MODEL_OPTIONS = [
  { value: "openai/gpt-5-mini", label: "GPT-5 mini" },
  { value: "openai/gpt-5", label: "GPT-5" },
  { value: "anthropic/claude-3-7-sonnet", label: "Claude 3.7 Sonnet" },
  { value: "anthropic/claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
];

export function PolicyDetail({
  policy,
  violatedIdentities,
  isLoadingViolations,
  onRefreshViolatedIdentities,
}: PolicyDetailProps) {
  const [processingIdentityId, setProcessingIdentityId] = useState<string | null>(
    null
  );
  const [openAIAvailable, setOpenAIAvailable] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultDialogTitle, setResultDialogTitle] = useState<string>("");
  const [resultDialogMessage, setResultDialogMessage] = useState<string>("");
  const [resultDialogIdentity, setResultDialogIdentity] =
    useState<IdentityDocument | null>(null);
  const [selectedAIModel, setSelectedAIModel] = useState<string>("openai/gpt-5-mini");

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
    if (processingIdentityId && processingIdentityId !== identity.id) {
      return;
    }

    setProcessingIdentityId(identity.id);
    setResultDialogIdentity(identity);
    setResultDialogTitle("Resolving policy violation");
    setResultDialogMessage("");
    setResultDialogOpen(true);

    try {
      const result = await resolvePolicyViolationWithAI(policy, identity, selectedAIModel);

      if ("error" in result) {
        setResultDialogTitle("Policy violation resolution failed");
        setResultDialogMessage(result.error);
      } else {
        setResultDialogTitle("Policy violation resolution result");
        setResultDialogMessage(result.message);
      }
    } catch (error) {
      setResultDialogTitle("Policy violation resolution failed");
      setResultDialogMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setProcessingIdentityId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const stateConf = getStateConfig(policy.state ?? "", violatedIdentities.length > 0);
  const StateIcon = stateConf.icon;
  const canShowActions = openAIAvailable && policy.state !== "NOT_ENFORCED";

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-teal-500/20 to-transparent rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {policy.state && (
                  <Badge className={cn("border gap-1.5", stateConf.color)}>
                    <StateIcon className="h-3.5 w-3.5" />
                    {stateConf.label}
                  </Badge>
                )}
                {policy.type && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "border-white/20 text-white/80 bg-white/5",
                      policy.type === "CONFLICTING_ACCESS_BASED" &&
                        "border-orange-400/40 text-orange-200 bg-orange-500/15"
                    )}
                  >
                    {formatPolicyType(policy.type)}
                  </Badge>
                )}
                {policy.scheduled && (
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    <Zap className="h-3 w-3 mr-1" />
                    Scheduled
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-balance">
                {policy.name}
              </h1>
              {policy.description && (
                <p className="text-sm text-white/70 max-w-2xl leading-relaxed">
                  {policy.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[80px]">
                <div className="text-2xl font-bold text-cyan-400">
                  {isLoadingViolations ? (
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  ) : (
                    violatedIdentities.length
                  )}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-white/50 mt-1">
                  Violations
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-white/10 text-sm flex-wrap">
            {policy.ownerRef && (
              <div className="flex items-center gap-2 text-white/70">
                <User className="w-4 h-4" />
                <span>{policy.ownerRef.name}</span>
              </div>
            )}
            {policy.created && (
              <div className="flex items-center gap-2 text-white/70">
                <Calendar className="w-4 h-4" />
                <span>Created {formatDate(policy.created)}</span>
              </div>
            )}
            {policy.modified && (
              <div className="flex items-center gap-2 text-white/70">
                <RefreshCw className="w-4 h-4" />
                <span>Modified {formatDate(policy.modified)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="details" className="gap-2 data-[state=active]:bg-background">
            <Info className="w-4 h-4" />
            Details
          </TabsTrigger>
          <TabsTrigger
            value="violations"
            className="gap-2 data-[state=active]:bg-background"
          >
            <AlertTriangle className="w-4 h-4" />
            Violations
            {violatedIdentities.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 px-1.5 text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400"
              >
                {violatedIdentities.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="overflow-hidden border-border/50">
              <div className="p-4 border-b border-border/50 bg-gradient-to-r from-cyan-500/5 to-transparent">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  Basic Information
                </h3>
              </div>
              <div className="p-4 space-y-4">
                {policy.id && (
                  <div className="group">
                    <p className="text-xs text-muted-foreground mb-1">Policy ID</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                        {policy.id}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          if (policy.id) {
                            copyToClipboard(policy.id);
                          }
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {policy.externalPolicyReference && (
                  <div className="group">
                    <p className="text-xs text-muted-foreground mb-1">External Reference</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm flex-1 truncate">
                        {policy.externalPolicyReference}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                )}
                {policy.ownerRef && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Owner</p>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white text-xs font-medium">
                        {policy.ownerRef.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm">{policy.ownerRef.name}</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {policy.policyQuery && (
              <Card className="overflow-hidden border-border/50">
                <div className="p-4 border-b border-border/50 bg-gradient-to-r from-teal-500/5 to-transparent">
                  <h3 className="font-semibold flex items-center gap-2 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center">
                      <Code className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    Policy Query
                  </h3>
                </div>
                <div className="p-4">
                  <div className="group relative">
                    <pre className="text-xs font-mono bg-slate-950 text-slate-300 p-4 rounded-lg overflow-x-auto">
                      {policy.policyQuery}
                    </pre>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        if (policy.policyQuery) {
                          copyToClipboard(policy.policyQuery);
                        }
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {policy.compensatingControls && (
              <Card className="overflow-hidden border-border/50">
                <div className="p-4 border-b border-border/50 bg-gradient-to-r from-amber-500/5 to-transparent">
                  <h3 className="font-semibold flex items-center gap-2 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    Compensating Controls
                  </h3>
                </div>
                <div className="p-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {policy.compensatingControls}
                  </p>
                </div>
              </Card>
            )}

            {policy.correctionAdvice && (
              <Card className="overflow-hidden border-border/50">
                <div className="p-4 border-b border-border/50 bg-gradient-to-r from-emerald-500/5 to-transparent">
                  <h3 className="font-semibold flex items-center gap-2 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    Correction Advice
                  </h3>
                </div>
                <div className="p-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {policy.correctionAdvice}
                  </p>
                </div>
              </Card>
            )}
          </div>

          {policy.conflictingAccessCriteria && (
            <Card className="overflow-hidden border-border/50">
              <div className="p-4 border-b border-border/50 bg-gradient-to-r from-rose-500/5 to-transparent">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  Conflicting Access Criteria
                </h3>
              </div>
              <div className="p-4">
                <div className="grid gap-6 md:grid-cols-2">
                  {policy.conflictingAccessCriteria.leftCriteria && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-500" />
                        <h4 className="text-sm font-medium">
                          {policy.conflictingAccessCriteria.leftCriteria.name ||
                            "Left Criteria"}
                        </h4>
                      </div>
                      {policy.conflictingAccessCriteria.leftCriteria.criteriaList?.map(
                        (criteria, index) => (
                          <div
                            key={index}
                            className="bg-muted/50 p-3 rounded-lg border border-border/50"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {criteria.type}
                              </Badge>
                              <span className="text-sm font-medium">{criteria.name}</span>
                            </div>
                            {criteria.id && (
                              <p className="text-xs text-muted-foreground font-mono mt-2">
                                {criteria.id}
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}
                  {policy.conflictingAccessCriteria.rightCriteria && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <h4 className="text-sm font-medium">
                          {policy.conflictingAccessCriteria.rightCriteria.name ||
                            "Right Criteria"}
                        </h4>
                      </div>
                      {policy.conflictingAccessCriteria.rightCriteria.criteriaList?.map(
                        (criteria, index) => (
                          <div
                            key={index}
                            className="bg-muted/50 p-3 rounded-lg border border-border/50"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {criteria.type}
                              </Badge>
                              <span className="text-sm font-medium">{criteria.name}</span>
                            </div>
                            {criteria.id && (
                              <p className="text-xs text-muted-foreground font-mono mt-2">
                                {criteria.id}
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {policy.tags && policy.tags.length > 0 && (
            <Card className="overflow-hidden border-border/50">
              <div className="p-4 border-b border-border/50 bg-gradient-to-r from-purple-500/5 to-transparent">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Tag className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  Tags
                </h3>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {policy.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="violations" className="mt-6">
          <Card className="overflow-hidden border-border/50">
            <div className="p-4 border-b border-border/50 bg-gradient-to-r from-rose-500/5 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Violated Identities</h3>
                  <p className="text-xs text-muted-foreground">
                    {isLoadingViolations
                      ? "Refreshing..."
                      : `${violatedIdentities.length} ${violatedIdentities.length === 1 ? "identity" : "identities"
                      } found`}
                  </p>
                </div>
              </div>
              {canShowActions && (
                <div className="flex items-end gap-2">
                  <div className="w-56 space-y-1">
                    <p className="text-xs text-muted-foreground">AI model</p>
                    <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
                      <SelectTrigger className="h-9 text-xs bg-background/80 border-border/50">
                        <SelectValue placeholder="Select AI model" />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_MODEL_OPTIONS.map((modelOption) => (
                          <SelectItem key={modelOption.value} value={modelOption.value}>
                            {modelOption.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefreshViolatedIdentities}
                    disabled={isLoadingViolations}
                    className="h-9"
                  >
                    <RefreshCw
                      className={cn("h-3.5 w-3.5 mr-2", isLoadingViolations && "animate-spin")}
                    />
                    Refresh
                  </Button>
                </div>
              )}
              {!canShowActions && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefreshViolatedIdentities}
                  disabled={isLoadingViolations}
                  className="h-9"
                >
                  <RefreshCw
                    className={cn("h-3.5 w-3.5 mr-2", isLoadingViolations && "animate-spin")}
                  />
                  Refresh
                </Button>
              )}
            </div>

            <div className="p-4">
              {isLoadingViolations ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin" />
                    <AlertTriangle className="w-5 h-5 text-rose-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Loading violated identities...
                  </p>
                </div>
              ) : violatedIdentities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-medium mb-1">No Violations Found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Great news! No identities are currently violating this policy.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Display Name</TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        {canShowActions && (
                          <TableHead className="font-semibold">Action</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {violatedIdentities.map((identity) => (
                        <TableRow key={identity.id} className="group">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-xs font-medium">
                                {identity.name?.charAt(0).toUpperCase() || "?"}
                              </div>
                              {identity.name || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>{identity.displayName || "N/A"}</TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">
                              {identity.email || "N/A"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {identity.status || "N/A"}
                            </Badge>
                          </TableCell>
                          {canShowActions && (
                            <TableCell className="text-right">
                              <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleIdentityAction(identity)}
                                    className="gap-2 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 hover:from-cyan-500/20 hover:to-teal-500/20 border-cyan-500/20"
                                  >
                                    <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
                                    Resolve with AI
                                    <ChevronRight className="h-3 w-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                      <Sparkles className="h-5 w-5 text-cyan-500" />
                                      {resultDialogTitle}
                                    </DialogTitle>
                                    <DialogDescription>
                                      {resultDialogIdentity
                                        ? `Policy: ${policy.name} · Identity: ${resultDialogIdentity.name ?? "N/A"
                                        }`
                                        : policy.name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="max-h-[60vh] overflow-auto rounded-lg border bg-slate-950 p-4 text-sm text-slate-300 whitespace-pre-wrap break-words font-mono">
                                    {processingIdentityId ? (
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-cyan-400">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          <span>Processing with AI...</span>
                                        </div>
                                        {resultDialogMessage && <div>{resultDialogMessage}</div>}
                                      </div>
                                    ) : (
                                      resultDialogMessage || "No message returned."
                                    )}
                                  </div>
                                  <DialogFooter>
                                    <Button onClick={() => setResultDialogOpen(false)}>
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
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
