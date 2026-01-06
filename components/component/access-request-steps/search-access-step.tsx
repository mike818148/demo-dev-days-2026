"use client";

import { useState, useEffect } from "react";
import React from "react";
import {
  Search,
  X,
  Plus,
  Loader2,
  Check,
  AlertCircle,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  searchRoles,
  getRoleCompanies,
  getRoleDepartments,
} from "@/lib/actions/isc";
import { RoleDocument } from "sailpoint-api-client";
import { toast } from "sonner";
import { isRequestCommentsRequired } from "@/lib/utils";
import { DocumentActionButtons } from "@/components/component/document-action-buttons";

interface SearchAccessStepProps {
  cart: RoleDocument[];
  onAddToCart: (role: RoleDocument) => void;
  onRemoveFromCart: (roleId: string) => void;
  roleComments: Record<string, string>;
  onCommentChange: (roleId: string, comment: string) => void;
  removalDates: Record<string, string>;
  onRemovalDateChange: (roleId: string, date: string) => void;
}

// Helper function to extract metadata attribute value by name
const getMetadataValue = (
  role: RoleDocument,
  attributeName: string
): { name: string; value: string } | null => {
  const metadata = (role as any).accessModelMetadata;
  if (!metadata || !Array.isArray(metadata)) {
    return null;
  }

  const attribute = metadata.find((attr: any) => attr.name === attributeName);
  if (!attribute || !attribute.value) {
    return null;
  }
  return {
    name: attribute.name,
    value: attribute.value,
  };
};

export function SearchAccessStep({
  cart,
  onAddToCart,
  onRemoveFromCart,
  roleComments,
  onCommentChange,
  removalDates,
  onRemovalDateChange,
}: SearchAccessStepProps) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedCompany, setSelectedCompany] = useState("All");
  const [showResults, setShowResults] = useState(false);
  const [roleSearchResults, setRoleSearchResults] = useState<RoleDocument[]>(
    []
  );
  const [isSearchingRoles, setIsSearchingRoles] = useState(false);

  // Role companies and departments from API
  const [roleCompanies, setRoleCompanies] = useState<string[]>([]);
  const [roleDepartments, setRoleDepartments] = useState<string[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

  // Fetch role companies and departments on component mount
  useEffect(() => {
    const fetchMetadata = async () => {
      setIsLoadingMetadata(true);
      try {
        const [companiesResult, departmentsResult] = await Promise.all([
          getRoleCompanies(),
          getRoleDepartments(),
        ]);

        if ("error" in companiesResult) {
          console.error(
            "Failed to fetch role companies:",
            companiesResult.error
          );
        } else {
          setRoleCompanies(companiesResult.values);
        }

        if ("error" in departmentsResult) {
          console.error(
            "Failed to fetch role departments:",
            departmentsResult.error
          );
        } else {
          setRoleDepartments(departmentsResult.values);
        }
      } catch (error) {
        console.error("Error fetching metadata:", error);
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    fetchMetadata();
  }, []);

  // Create departments array with "All" option and fetched departments
  const departments = ["All", ...roleDepartments];
  // Create companies array with "All" option and fetched companies
  const companies = ["All", ...roleCompanies];

  const handleSearch = async () => {
    setIsSearchingRoles(true);
    setShowResults(true);
    try {
      const companyFilter =
        selectedCompany && selectedCompany !== "All"
          ? selectedCompany
          : undefined;
      const departmentFilter =
        selectedDepartment && selectedDepartment !== "All"
          ? selectedDepartment
          : undefined;

      const result = await searchRoles(
        searchKeyword || "*",
        companyFilter,
        departmentFilter
      );

      if ("error" in result) {
        toast.error(`Failed to search roles: ${result.error}`);
        setRoleSearchResults([]);
      } else {
        setRoleSearchResults(result.roles);
      }
    } catch (error) {
      console.error("Error searching roles:", error);
      setRoleSearchResults([]);
      toast.error("Failed to search roles. Please try again.");
    } finally {
      setIsSearchingRoles(false);
    }
  };

  return (
    <div className="h-full w-full">
      <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
        {/* Left Column - Search Access and Search Results (60%) */}
        <ResizablePanel defaultSize={60} minSize={40}>
          <div className="h-full flex flex-col gap-6 pr-3">
            {/* Search Access */}
            <Card>
              <CardHeader className="py-2 px-4 bg-secondary">
                <CardTitle className="flex items-center gap-2 text-sm leading-tight">
                  Search Access
                </CardTitle>
                <CardDescription className="text-xs mt-0.5 leading-tight">
                  Search and add access roles for the selected users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="keyword">Keyword Search</Label>
                  <div className="flex gap-2">
                    <Input
                      id="keyword"
                      placeholder="Search by role name..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Button
                      onClick={handleSearch}
                      size="icon"
                      className="flex-shrink-0"
                      disabled={isSearchingRoles}
                    >
                      {isSearchingRoles ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select
                      value={selectedDepartment}
                      onValueChange={setSelectedDepartment}
                      disabled={isLoadingMetadata}
                    >
                      <SelectTrigger id="department">
                        <SelectValue
                          placeholder={
                            isLoadingMetadata
                              ? "Loading..."
                              : "Select department"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Select
                      value={selectedCompany}
                      onValueChange={setSelectedCompany}
                      disabled={isLoadingMetadata}
                    >
                      <SelectTrigger id="company">
                        <SelectValue
                          placeholder={
                            isLoadingMetadata ? "Loading..." : "Select company"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company} value={company}>
                            {company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search Results */}
            {showResults && (
              <Card className="flex-1 flex flex-col min-h-0">
                <CardHeader className="py-2 px-4 bg-secondary">
                  <CardTitle className="text-sm leading-tight">
                    Search Results
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5 leading-tight">
                    {isSearchingRoles
                      ? "Searching roles..."
                      : `Found ${roleSearchResults.length} role${
                          roleSearchResults.length !== 1 ? "s" : ""
                        }`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto min-h-0 mt-2">
                  {isSearchingRoles ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : roleSearchResults.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      No roles found matching your criteria
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {roleSearchResults.map((role) => {
                        const isInCart = cart.find(
                          (item) => item.id === role.id
                        );
                        return (
                          <div
                            key={role.id}
                            className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent/50 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm text-card-foreground">
                                {(role as any).name ||
                                  (role as any).displayName ||
                                  "Unnamed Role"}
                              </p>
                              {(role as any).description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {(role as any).description}
                                </p>
                              )}
                              <div className="mt-2 flex flex-wrap gap-1">
                                {(role as any).type && (
                                  <Badge variant="secondary">
                                    Type: {(role as any).type}
                                  </Badge>
                                )}
                                {(role as any).owner?.name && (
                                  <Badge variant="secondary">
                                    Owner: {(role as any).owner?.name}
                                  </Badge>
                                )}
                                {(role as any).accessModelMetadata &&
                                  Array.isArray(
                                    (role as any).accessModelMetadata
                                  ) &&
                                  (role as any).accessModelMetadata.length >
                                    0 &&
                                  (role as any).accessModelMetadata.map(
                                    (meta: any, index: number) => (
                                      <Badge variant="secondary" key={index}>
                                        {meta.name}: {meta.value || "—"}
                                      </Badge>
                                    )
                                  )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <DocumentActionButtons document={role} />
                              <Button
                                variant={isInCart ? "secondary" : "default"}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onAddToCart(role)}
                                disabled={!!isInCart}
                              >
                                {isInCart ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Plus className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        {/* Right Column - Selected Roles (40%) */}
        <ResizablePanel defaultSize={40} minSize={30}>
          <div className="h-full pl-3">
            {cart.length > 0 ? (
              <Card className="h-full flex flex-col">
                <CardHeader className="py-2 px-4 bg-secondary">
                  <CardTitle className="flex items-center gap-2 text-sm leading-tight">
                    Add Access
                    <Badge
                      variant="secondary"
                      className="bg-green-500 text-white"
                    >
                      {cart.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto min-h-0 mt-2">
                  <div className="space-y-3">
                    {cart.map((role) => {
                      const roleName =
                        (role as any).name ||
                        (role as any).displayName ||
                        "Unnamed Role";
                      const roleDescription = (role as any).description;

                      return (
                        <div
                          key={role.id}
                          className="rounded-lg border p-3 bg-card border-border"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 flex-1">
                              <Button
                                onClick={() => onRemoveFromCart(role.id)}
                                variant="ghost"
                                size="icon"
                                className="mt-1 h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">
                                  {roleName}
                                </p>
                                {roleDescription && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    {roleDescription}
                                  </p>
                                )}
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {(role as any).type && (
                                    <Badge variant="secondary">
                                      Type: {(role as any).type}
                                    </Badge>
                                  )}
                                  {(role as any).owner?.name && (
                                    <Badge variant="secondary">
                                      Owner: {(role as any).owner?.name}
                                    </Badge>
                                  )}
                                  {removalDates[role.id] && (
                                    <Badge
                                      variant="outline"
                                      className="text-primary"
                                    >
                                      <CalendarIcon className="h-3 w-3 mr-1" />
                                      Removal:{" "}
                                      {new Date(
                                        removalDates[role.id]
                                      ).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </Badge>
                                  )}
                                  {(role as any).accessModelMetadata &&
                                    Array.isArray(
                                      (role as any).accessModelMetadata
                                    ) &&
                                    (role as any).accessModelMetadata.length >
                                      0 &&
                                    (role as any).accessModelMetadata.map(
                                      (meta: any, index: number) => (
                                        <Badge variant="secondary" key={index}>
                                          {meta.name}: {meta.value || "—"}
                                        </Badge>
                                      )
                                    )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isRequestCommentsRequired(role) &&
                                (!roleComments[role.id] ||
                                  roleComments[role.id].trim() === "") && (
                                  <AlertCircle className="h-4 w-4 text-destructive" />
                                )}
                              <DocumentActionButtons
                                document={role}
                                roleComments={roleComments}
                                onCommentChange={onCommentChange}
                                removalDates={removalDates}
                                onRemovalDateChange={onRemovalDateChange}
                                showComment={true}
                                showRemovalDate={true}
                                isRequestCommentsRequired={
                                  isRequestCommentsRequired
                                }
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex flex-col">
                <CardContent className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center">
                    No roles selected yet. Search and add roles from the left.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
