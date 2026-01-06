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
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { RequestedItemStatus } from "sailpoint-api-client";

const ITEMS_PER_PAGE = 10;

interface AccessRequestListProps {
  requests: RequestedItemStatus[];
  selectedRequestId: string;
  onSelectRequest: (id: string) => void;
  isLoading?: boolean;
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
  };
  return (
    colors[state as keyof typeof colors] || "bg-muted text-muted-foreground"
  );
};

export function AccessRequestList({
  requests,
  selectedRequestId,
  onSelectRequest,
  isLoading = false,
}: AccessRequestListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [requesteeFilter, setRequesteeFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const uniqueRequestees = useMemo(() => {
    const requestees = new Set(
      requests.map((req) => req.requestedFor?.name ?? "")
    );
    return Array.from(requestees).sort();
  }, [requests]);

  const uniqueStates = useMemo(() => {
    const states = new Set(requests.map((req) => req.state));
    return Array.from(states).sort();
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchesSearch =
        req.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.requester?.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        req.accessRequestId?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRequestee =
        requesteeFilter === "all" ||
        req.requestedFor?.name?.toLowerCase() === requesteeFilter.toLowerCase();
      const matchesState = stateFilter === "all" || req.state === stateFilter;

      return matchesSearch && matchesRequestee && matchesState;
    });
  }, [requests, searchQuery, requesteeFilter, stateFilter]);

  // Paginate filtered requests
  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleRequesteeFilter = (value: string) => {
    setRequesteeFilter(value);
    setCurrentPage(1);
  };

  const handleStateFilter = (value: string) => {
    setStateFilter(value);
    setCurrentPage(1);
  };

  return (
    <div className="w-full h-full p-2 flex flex-col min-w-0">
      <ResizablePanelGroup orientation="vertical" className="h-full p-4">
        {/* Search Section - Collapsible */}
        <ResizablePanel
          defaultSize={30}
          minSize={0}
          collapsible={true}
          collapsedSize={5}
          className="overflow-auto"
        >
          <div className="space-y-4 p-4">
            <div>
              <h1 className="font-semibold text-balance">Access Requests</h1>
              {isLoading ? (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredRequests.length}{" "}
                  {filteredRequests.length === 1 ? "request" : "requests"}
                </p>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  Requestee
                </label>
                <Select
                  value={requesteeFilter}
                  onValueChange={handleRequesteeFilter}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All requestees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All requestees</SelectItem>
                    {uniqueRequestees.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
            </div>
          </div>
        </ResizablePanel>

        {/* Results Section */}
        <ResizablePanel
          defaultSize={70}
          minSize={30}
          className="flex flex-col border-t p-4"
        >
          <div className="flex-1 overflow-auto min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center flex-1 w-full">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Loading requests...
                  </p>
                </div>
              </div>
            ) : paginatedRequests.length > 0 ? (
              <div className="divide-y">
                {paginatedRequests.map((request, index) => (
                  <button
                    key={request.accessRequestId ?? `request-${index}`}
                    onClick={() => {
                      if (request.accessRequestId) {
                        onSelectRequest(String(request.accessRequestId));
                      }
                    }}
                    className={cn(
                      "w-full p-4 text-left transition-colors hover:bg-accent/50",
                      selectedRequestId === request.accessRequestId &&
                        "bg-accent"
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-sm leading-tight text-balance line-clamp-2">
                          {request.name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs border flex-shrink-0",
                            getStateColor(request.state ?? "")
                          )}
                        >
                          {request.state}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Requester:</span>{" "}
                          {request.requester?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">For:</span>{" "}
                          {request.requestedFor?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Type:</span>{" "}
                          {request.requestType?.replace(/_/g, " ")}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(request.created ?? "")}
                        </p>
                        {request.privilegeLevel && (
                          <Badge variant="secondary" className="text-xs">
                            {request.privilegeLevel}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center flex-1 w-full text-sm text-muted-foreground">
                No requests found
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
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
