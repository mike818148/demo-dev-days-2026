"use client";

import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Filter,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IdentityDocument, SodPolicyRead } from "sailpoint-api-client";
import { getPolicyViolatedIdentities } from "@/lib/actions/isc";

const ITEMS_PER_PAGE = 5;

type ViolationCountState = Record<
  string,
  {
    count: number;
    identities: IdentityDocument[];
    isLoading: boolean;
  }
>;

export interface PolicyViolationsUpdate {
  policyId: string;
  identities: IdentityDocument[];
  isLoading: boolean;
}

interface PolicyListProps {
  policies: SodPolicyRead[];
  selectedPolicyId: string;
  onSelectPolicy: (id: string) => void;
  onPolicyViolationsUpdate?: (update: PolicyViolationsUpdate) => void;
  isLoading?: boolean;
}

const stateConfig = {
  ENFORCED: {
    color:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    borderColor: "border-l-emerald-500",
    bgHover: "hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20",
    icon: CheckCircle2,
    glow: "shadow-emerald-500/10",
    label: "Enforced",
  },
  ENFORCED_WITH_VIOLATIONS: {
    color:
      "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    borderColor: "border-l-rose-500",
    bgHover: "hover:bg-rose-50/50 dark:hover:bg-rose-950/20",
    icon: AlertTriangle,
    glow: "shadow-rose-500/10",
    label: "Enforced with Violations",
  },
  NOT_ENFORCED: {
    color:
      "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20",
    borderColor: "border-l-slate-400",
    bgHover: "hover:bg-slate-50/50 dark:hover:bg-slate-800/20",
    icon: XCircle,
    glow: "shadow-slate-500/10",
    label: "Disabled",
  },
};

const typeConfig = {
  GENERAL: {
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
  CONFLICTING_ACCESS_BASED: {
    color:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  CONFLICT: {
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
};

const formatPolicyType = (type: string) => {
  if (type === "CONFLICTING_ACCESS_BASED") {
    return "SOD";
  }
  return type;
};

const getStateConfig = (state: string, violationCount?: number) => {
  if (state === "ENFORCED" && typeof violationCount === "number" && violationCount > 0) {
    return stateConfig.ENFORCED_WITH_VIOLATIONS;
  }

  return stateConfig[state as keyof typeof stateConfig] || stateConfig.NOT_ENFORCED;
};

const getTypeConfig = (type: string) => {
  return (
    typeConfig[type as keyof typeof typeConfig] || {
      color: "bg-muted text-muted-foreground",
    }
  );
};

export function PolicyList({
  policies,
  selectedPolicyId,
  onSelectPolicy,
  onPolicyViolationsUpdate,
  isLoading = false,
}: PolicyListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [violationCounts, setViolationCounts] = useState<ViolationCountState>({});

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const uniqueStates = useMemo(() => {
    const states = new Set(policies.map((policy) => policy.state).filter(Boolean));
    return Array.from(states).sort();
  }, [policies]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(policies.map((policy) => policy.type).filter(Boolean));
    return Array.from(types).sort();
  }, [policies]);

  const filteredPolicies = useMemo(() => {
    return policies.filter((policy) => {
      const matchesSearch =
        policy.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.externalPolicyReference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.id?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesState = stateFilter === "all" || policy.state === stateFilter;
      const matchesType = typeFilter === "all" || policy.type === typeFilter;

      return matchesSearch && matchesState && matchesType;
    });
  }, [policies, searchQuery, stateFilter, typeFilter]);

  // Paginate filtered policies
  const totalPages = Math.ceil(filteredPolicies.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPolicies = filteredPolicies.slice(startIndex, endIndex);

  useEffect(() => {
    const policiesToLoad = paginatedPolicies.filter((policy) => {
      if (!policy.id || !policy.policyQuery || policy.state !== "ENFORCED") {
        return false;
      }

      return !violationCounts[policy.id];
    });

    if (policiesToLoad.length === 0) {
      return;
    }

    setViolationCounts((current) => {
      const next = { ...current };
      for (const policy of policiesToLoad) {
        if (policy.id) {
          next[policy.id] = { count: 0, identities: [], isLoading: true };
          onPolicyViolationsUpdate?.({
            policyId: policy.id,
            identities: [],
            isLoading: true,
          });
        }
      }
      return next;
    });

    const loadViolationCounts = async () => {
      const results = await Promise.all(
        policiesToLoad.map(async (policy) => {
          if (!policy.id || !policy.policyQuery) {
            return null;
          }

          try {
            const result = await getPolicyViolatedIdentities(policy.policyQuery);
            const identities = "identities" in result ? result.identities : [];
            return {
              policyId: policy.id,
              identities,
              count: identities.length,
            };
          } catch (error) {
            console.error("Error loading policy violation count:", error);
            return {
              policyId: policy.id,
              identities: [],
              count: 0,
            };
          }
        })
      );

      setViolationCounts((current) => {
        const next = { ...current };
        for (const result of results) {
          if (result) {
            next[result.policyId] = {
              count: result.count,
              identities: result.identities,
              isLoading: false,
            };
            onPolicyViolationsUpdate?.({
              policyId: result.policyId,
              identities: result.identities,
              isLoading: false,
            });
          }
        }
        return next;
      });
    };

    loadViolationCounts();
  }, [onPolicyViolationsUpdate, paginatedPolicies, violationCounts]);

  // Reset to page 1 when filters change
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStateFilter = (value: string) => {
    setStateFilter(value);
    setCurrentPage(1);
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };

  const activeFilters =
    (stateFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0);

  return (
    <div className="w-full h-full flex flex-col min-w-0">
      <div className="flex-shrink-0 p-4 space-y-4 border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-teal-500/20">
              <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Policies</h2>
              {isLoading ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {filteredPolicies.length} of {policies.length} policies
                </p>
              )}
            </div>
          </div>
          {activeFilters > 0 && (
            <Badge
              variant="secondary"
              className="text-xs bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
            >
              <Filter className="w-3 h-3 mr-1" />
              {activeFilters} filter{activeFilters > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-cyan-500" />
          <Input
            placeholder="Search policies..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 bg-background/50 border-border/50 focus:border-cyan-500/50 focus:ring-cyan-500/20 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select value={stateFilter} onValueChange={handleStateFilter}>
            <SelectTrigger className="h-9 text-xs bg-background/50 border-border/50">
              <SelectValue placeholder="All states" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              {uniqueStates.map((state) => {
                const config = getStateConfig(state ?? "");
                const Icon = config.icon;
                return (
                  <SelectItem key={state ?? ""} value={state ?? ""}>
                    <span className="flex items-center gap-2">
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={handleTypeFilter}>
            <SelectTrigger className="h-9 text-xs bg-background/50 border-border/50">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {uniqueTypes.map((type) => (
                <SelectItem key={type ?? ""} value={type ?? ""}>
                  {formatPolicyType(type ?? "")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
              <Shield className="w-5 h-5 text-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-sm text-muted-foreground">Loading policies...</p>
          </div>
        ) : paginatedPolicies.length > 0 ? (
          <div className="p-2 space-y-1">
            {paginatedPolicies.map((policy, index) => {
              const violationCountState = policy.id
                ? violationCounts[policy.id]
                : undefined;
              const violationCount = violationCountState?.isLoading
                ? undefined
                : violationCountState?.count;
              const stateConf = getStateConfig(policy.state ?? "", violationCount);
              const typeConf = getTypeConfig(policy.type ?? "");
              const Icon = stateConf.icon;
              const isSelected = selectedPolicyId === policy.id;

              return (
                <button
                  key={policy.id ?? `policy-${index}`}
                  onClick={() => {
                    if (policy.id) {
                      onSelectPolicy(policy.id);
                    }
                  }}
                  className={cn(
                    "w-full p-3 text-left rounded-lg border-l-4 transition-all duration-200",
                    "hover:shadow-md",
                    stateConf.borderColor,
                    stateConf.bgHover,
                    isSelected
                      ? cn(
                          "bg-gradient-to-r from-cyan-50 to-teal-50/50 dark:from-cyan-950/30 dark:to-teal-950/20 shadow-md",
                          stateConf.glow
                        )
                      : "bg-background/50 hover:bg-background"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          "flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center mt-0.5",
                          stateConf.color
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className={cn(
                            "font-medium text-sm leading-tight line-clamp-2",
                            isSelected && "text-cyan-700 dark:text-cyan-300"
                          )}
                        >
                          {policy.name}
                        </h3>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pl-8">
                      {policy.state && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 border",
                            stateConf.color
                          )}
                        >
                          {stateConf.label}
                        </Badge>
                      )}
                      {policy.state === "ENFORCED" && violationCountState && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 border",
                            violationCountState.isLoading
                              ? "bg-muted text-muted-foreground border-border"
                              : violationCountState.count > 0
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          )}
                        >
                          {violationCountState.isLoading ? (
                            <>
                              <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
                              Checking
                            </>
                          ) : (
                            `${violationCountState.count} ${
                              violationCountState.count === 1 ? "violation" : "violations"
                            }`
                          )}
                        </Badge>
                      )}
                      {policy.type && (
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0 border", typeConf.color)}
                        >
                          {formatPolicyType(policy.type)}
                        </Badge>
                      )}
                      {policy.scheduled && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 border bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                        >
                          <Zap className="w-2.5 h-2.5 mr-0.5" />
                          Scheduled
                        </Badge>
                      )}
                    </div>

                    {policy.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-8">
                        {policy.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pl-8 pt-1">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {policy.ownerRef && (
                          <span className="truncate max-w-[100px]">
                            {policy.ownerRef.name}
                          </span>
                        )}
                        {policy.ownerRef && policy.created && (
                          <span className="text-border">•</span>
                        )}
                        {policy.created && <span>{formatDate(policy.created)}</span>}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="font-medium text-sm mb-1">No policies found</h3>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex-shrink-0 border-t border-border/50 p-3 bg-gradient-to-t from-muted/30 to-transparent">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7 p-0 hover:bg-cyan-500/10 hover:text-cyan-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-7 w-7 p-0 hover:bg-cyan-500/10 hover:text-cyan-600"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
