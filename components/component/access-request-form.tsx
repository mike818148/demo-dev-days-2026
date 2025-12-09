"use client";

import { useState, useEffect } from "react";
import { Search, ShoppingCart, X, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Separator } from "@/components/ui/separator";
import {
  searchIdentities,
  searchRoles,
  getRoleCompanies,
  getRoleDepartments,
  createAccessRequest,
} from "@/lib/actions/isc";
import { IdentityDocument, RoleDocument } from "sailpoint-api-client";
import { toast } from "sonner";

export default function AccessRequestForm() {
  const [selectedRequestees, setSelectedRequestees] = useState<
    IdentityDocument[]
  >([]);
  const [userSearchKeyword, setUserSearchKeyword] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<IdentityDocument[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  const [reason, setReason] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedCompany, setSelectedCompany] = useState("All");
  const [cart, setCart] = useState<RoleDocument[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [roleSearchResults, setRoleSearchResults] = useState<RoleDocument[]>(
    []
  );
  const [isSearchingRoles, setIsSearchingRoles] = useState(false);

  // Role companies and departments from API
  const [roleCompanies, setRoleCompanies] = useState<string[]>([]);
  const [roleDepartments, setRoleDepartments] = useState<string[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  // Helper function to extract metadata attribute value by name
  const getMetadataValue = (
    role: RoleDocument,
    attributeName: string
  ): { name: string; value: string } | null => {
    const metadata = (role as any).accessModelMetadata;
    if (!metadata || !Array.isArray(metadata)) {
      return null;
    }

    console.log("metadata", metadata);

    const attribute = metadata.find((attr: any) => attr.name === attributeName);
    console.log("attribute", attribute);
    if (!attribute || !attribute.value) {
      return null;
    }
    console.log("attribute.value", attribute.value);
    return {
      name: attribute.name,
      value: attribute.value,
    };
  };

  const searchUsers = async () => {
    if (!userSearchKeyword.trim()) {
      setSearchResults([]);
      setShowUserDropdown(false);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const result = await searchIdentities(userSearchKeyword);
      if ("error" in result) {
        toast.error(`Failed to search users: ${result.error}`);
        setSearchResults([]);
      } else {
        setSearchResults(result.users);
        setShowUserDropdown(true);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
      toast.error("Failed to search users. Please try again.");
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const addRequestee = (user: IdentityDocument) => {
    if (!selectedRequestees.find((u) => u.id === user.id)) {
      setSelectedRequestees([...selectedRequestees, user]);
    }
    setUserSearchKeyword("");
    setShowUserDropdown(false);
  };

  const removeRequestee = (userId: string) => {
    setSelectedRequestees(selectedRequestees.filter((u) => u.id !== userId));
  };

  const addToCart = (role: RoleDocument) => {
    if (!cart.find((item) => item.id === role.id)) {
      setCart([...cart, role]);
    }
  };

  const removeFromCart = (roleId: string) => {
    setCart(cart.filter((item) => item.id !== roleId));
  };

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

  const handleSubmit = async () => {
    setSubmitError(null);

    // Validation
    const errors: string[] = [];
    if (cart.length === 0) {
      errors.push("Please add at least one role to your cart");
    }
    if (selectedRequestees.length === 0) {
      errors.push("Please select at least one requestee");
    }

    if (errors.length > 0) {
      setSubmitError(errors.join(". "));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createAccessRequest(
        cart,
        selectedRequestees,
        reason
      );

      if ("error" in result) {
        setSubmitError(result.error);
      } else {
        // Success - reset form
        setCart([]);
        setSelectedRequestees([]);
        setReason("");
        setSubmitError(null);
        toast.success("Access request submitted successfully!");
      }
    } catch (error) {
      console.error("Error submitting access request:", error);
      setSubmitError("Failed to submit access request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validation helper
  const isSubmitDisabled =
    cart.length === 0 || selectedRequestees.length === 0 || isSubmitting;

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Side - Request Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
              <CardDescription>
                Specify who is requesting and the reason for access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="requestee">Requestee</Label>
                <div className="relative">
                  <div className="min-h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {selectedRequestees.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {selectedRequestees.map((user) => (
                          <Badge
                            key={user.id}
                            variant="secondary"
                            className="gap-1"
                          >
                            {user.displayName || user.name}
                            <button
                              onClick={() => removeRequestee(user.id)}
                              className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Input
                        id="requestee"
                        placeholder="Type keyword to search users..."
                        value={userSearchKeyword}
                        onChange={(e) => {
                          setUserSearchKeyword(e.target.value);
                          setShowUserDropdown(false);
                          setSearchResults([]);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            searchUsers();
                          }
                        }}
                        className="border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
                      />
                      <Button
                        onClick={searchUsers}
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 flex-shrink-0"
                        disabled={isSearchingUsers || !userSearchKeyword.trim()}
                      >
                        {isSearchingUsers ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {showUserDropdown && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 rounded-md border border-border bg-popover shadow-md max-h-60 overflow-auto">
                      {searchResults.map((user) => {
                        const isSelected = selectedRequestees.find(
                          (u) => u.id === user.id
                        );
                        return (
                          <button
                            key={user.id}
                            onClick={() => addRequestee(user)}
                            disabled={!!isSelected}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">
                                {user.name}
                              </p>
                              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                                {user.email && (
                                  <span>
                                    <span className="font-medium">Email:</span>{" "}
                                    <span className="truncate">
                                      {user.email}
                                    </span>
                                  </span>
                                )}
                                {user.attributes?.costCenter && (
                                  <span>
                                    <span className="font-medium">
                                      Cost Center:
                                    </span>{" "}
                                    {user.attributes.costCenter}
                                  </span>
                                )}
                                {user.attributes?.department && (
                                  <span>
                                    <span className="font-medium">
                                      Department:
                                    </span>{" "}
                                    {user.attributes.department}
                                  </span>
                                )}
                                {user.attributes?.title && (
                                  <span>
                                    <span className="font-medium">Title:</span>{" "}
                                    {user.attributes.title}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <Badge variant="secondary" className="text-xs">
                                Selected
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {showUserDropdown &&
                    !isSearchingUsers &&
                    searchResults.length === 0 &&
                    userSearchKeyword.trim() && (
                      <div className="absolute z-50 w-full mt-1 rounded-md border border-border bg-popover shadow-md p-3">
                        <p className="text-sm text-muted-foreground text-center">
                          No users found. Try a different keyword.
                        </p>
                      </div>
                    )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Request</Label>
                <Textarea
                  id="reason"
                  placeholder="Please provide a detailed reason for this access request..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Shopping Cart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Selected Access Items
                {cart.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {cart.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No items added yet. Search and add roles from the right panel.
                </p>
              ) : (
                <div className="space-y-3">
                  {cart.map((role) => {
                    const companyMeta = getMetadataValue(role, "company");
                    const departmentMeta = getMetadataValue(role, "department");
                    return (
                      <div
                        key={role.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3"
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
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {departmentMeta && (
                              <Badge variant="outline" className="text-xs">
                                {departmentMeta.name}: {departmentMeta.value}
                              </Badge>
                            )}
                            {companyMeta && (
                              <Badge variant="outline" className="text-xs">
                                {companyMeta.name}: {companyMeta.value}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => removeFromCart(role.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              <Separator className="my-4" />
              <div className="space-y-2">
                <Button
                  onClick={handleSubmit}
                  className="w-full"
                  size="lg"
                  disabled={isSubmitDisabled}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </Button>
                {submitError && (
                  <p className="text-sm text-destructive text-center">
                    {submitError}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Search & Results */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Roles</CardTitle>
              <CardDescription>
                Filter by keyword, department, and company
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                          isLoadingMetadata ? "Loading..." : "Select department"
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
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  {isSearchingRoles
                    ? "Searching roles..."
                    : `Found ${roleSearchResults.length} role${
                        roleSearchResults.length !== 1 ? "s" : ""
                      }`}
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                      const isInCart = cart.find((item) => item.id === role.id);
                      const companyMeta = getMetadataValue(role, "company");
                      const departmentMeta = getMetadataValue(
                        role,
                        "department"
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
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {departmentMeta && (
                                <Badge variant="outline" className="text-xs">
                                  {departmentMeta.name}: {departmentMeta.value}
                                </Badge>
                              )}
                              {companyMeta && (
                                <Badge variant="outline" className="text-xs">
                                  {companyMeta.name}: {companyMeta.value}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant={isInCart ? "secondary" : "default"}
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={() => addToCart(role)}
                            disabled={!!isInCart}
                          >
                            {isInCart ? (
                              <X className="h-4 w-4" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
