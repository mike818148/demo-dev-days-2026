"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResizablePanelGroup, ResizablePanel } from "@/components/ui/resizable";
import { SodPolicyRead } from "sailpoint-api-client";

const ITEMS_PER_PAGE = 10;

interface PolicyListProps {
  policies: SodPolicyRead[];
  selectedPolicyId: string;
  onSelectPolicy: (id: string) => void;
  isLoading?: boolean;
}

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

const getTypeColor = (type: string) => {
  const colors = {
    GENERAL: "bg-primary/10 text-primary border-primary/20",
    CONFLICT: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    colors[type as keyof typeof colors] || "bg-muted text-muted-foreground"
  );
};

export function PolicyList({
  policies,
  selectedPolicyId,
  onSelectPolicy,
  isLoading = false,
}: PolicyListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

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

  return (
    <div className="w-full h-full p-2 flex flex-col min-w-0">
      <div className="space-y-4">
        <div>
          <h1 className="font-semibold text-balance">SOD Policies</h1>
          {isLoading ? (
            <div className="flex items-center gap-2 mt-1">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              {filteredPolicies.length}{" "}
              {filteredPolicies.length === 1 ? "policy" : "policies"}
            </p>
          )}
        </div>

        {/* Search Section */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search policies..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">State</label>
            <Select value={stateFilter} onValueChange={handleStateFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                {uniqueStates.map((state) => (
                  <SelectItem key={state ?? ""} value={state ?? ""}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={typeFilter} onValueChange={handleTypeFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type ?? ""} value={type ?? ""}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Results Section */}
      <div className="flex-1 overflow-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center flex-1 w-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Loading policies...
              </p>
            </div>
          </div>
        ) : paginatedPolicies.length > 0 ? (
          <div className="divide-y">
            {paginatedPolicies.map((policy, index) => (
              <button
                key={policy.id ?? `policy-${index}`}
                onClick={() => {
                  if (policy.id) {
                    onSelectPolicy(policy.id);
                  }
                }}
                className={cn(
                  "w-full p-4 text-left transition-colors hover:bg-accent/50",
                  selectedPolicyId === policy.id && "bg-accent"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-sm leading-tight text-balance line-clamp-2">
                      {policy.name}
                    </h3>
                    <div className="flex gap-1 flex-shrink-0">
                      {policy.state && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs border",
                            getStateColor(policy.state)
                          )}
                        >
                          {policy.state}
                        </Badge>
                      )}
                      {policy.type && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs border",
                            getTypeColor(policy.type)
                          )}
                        >
                          {policy.type}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {policy.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {policy.description}
                    </p>
                  )}

                  <div className="space-y-1">
                    {policy.ownerRef && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Owner:</span>{" "}
                        {policy.ownerRef.name}
                      </p>
                    )}
                    {policy.externalPolicyReference && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Reference:</span>{" "}
                        {policy.externalPolicyReference}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-muted-foreground">
                      {policy.created && formatDate(policy.created)}
                    </p>
                    {policy.scheduled && (
                      <Badge variant="secondary" className="text-xs">
                        Scheduled
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1 w-full text-sm text-muted-foreground">
            No policies found
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t flex items-center justify-between pt-4 mt-4 flex-shrink-0">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.max(1, prev - 1))
              }
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
