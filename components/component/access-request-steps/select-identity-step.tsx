"use client";

import { useState, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import {
  Search,
  Loader2,
  ArrowUpDown,
  UserSearch,
  Filter,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { searchIdentities } from "@/lib/actions/isc";
import { IdentityDocument } from "sailpoint-api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Filter Popover Component
interface FilterPopoverProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  availableValues: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  onClear: () => void;
  trigger: React.ReactNode;
}

function FilterPopover({
  isOpen,
  onOpenChange,
  availableValues,
  selectedValues,
  onSelectionChange,
  onClear,
  trigger,
}: FilterPopoverProps) {
  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onSelectionChange(selectedValues.filter((v) => v !== value));
    } else {
      onSelectionChange([...selectedValues, value]);
    }
  };

  return (
    <div className="relative">
      {trigger}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => onOpenChange(false)}
          />
          <div className="absolute left-0 z-50 mt-1 w-64 rounded-md border bg-popover shadow-md">
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Filter</span>
                {selectedValues.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClear();
                    }}
                    className="h-7 text-xs"
                  >
                    Clear all
                  </Button>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {availableValues.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    No values available
                  </p>
                ) : (
                  availableValues.map((value) => {
                    const isSelected = selectedValues.includes(value);
                    return (
                      <label
                        key={value}
                        className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleValue(value)}
                            className="sr-only"
                          />
                          <div
                            className={cn(
                              "h-4 w-4 rounded border-2 flex items-center justify-center",
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-input"
                            )}
                          >
                            {isSelected && (
                              <Check className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                        </div>
                        <span className="text-sm flex-1">{value}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface SelectIdentityStepProps {
  selectedRequestees: IdentityDocument[];
  onAddRequestee: (user: IdentityDocument) => void;
  onRemoveRequestee: (userId: string) => void;
}

const createColumns = (
  selectedRequestees: IdentityDocument[],
  onAddRequestee: (user: IdentityDocument) => void,
  getColumnFilterValues: (columnId: string) => string[],
  setColumnFilterValues: (columnId: string, values: string[]) => void,
  availableDepartments: string[],
  availableCostCenters: string[],
  availableManagers: string[],
  availableNames: string[],
  availableDisplayNames: string[],
  openFilterPopover: string | null,
  setOpenFilterPopover: (columnId: string | null) => void
): ColumnDef<IdentityDocument>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => {
      const selectedValues = getColumnFilterValues(column.id);
      const isOpen = openFilterPopover === column.id;
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
          <FilterPopover
            isOpen={isOpen}
            onOpenChange={(open) =>
              setOpenFilterPopover(open ? column.id : null)
            }
            availableValues={availableNames}
            selectedValues={selectedValues}
            onSelectionChange={(values) =>
              setColumnFilterValues(column.id, values)
            }
            onClear={() => setColumnFilterValues(column.id, [])}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 relative",
                  selectedValues.length > 0 && "text-primary"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenFilterPopover(isOpen ? null : column.id);
                }}
              >
                <Filter className="h-3 w-3" />
                {selectedValues.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                    {selectedValues.length}
                  </span>
                )}
              </Button>
            }
          />
        </div>
      );
    },
    cell: ({ row }) => {
      const user = row.original;
      return <div className="font-medium">{user.name || "N/A"}</div>;
    },
    filterFn: (row, id, values) => {
      if (!values || values.length === 0) return true;
      const name = row.original.name || "";
      return values.includes(name);
    },
  },
  {
    accessorKey: "displayName",
    header: ({ column }) => {
      const selectedValues = getColumnFilterValues(column.id);
      const isOpen = openFilterPopover === column.id;
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Display Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
          <FilterPopover
            isOpen={isOpen}
            onOpenChange={(open) =>
              setOpenFilterPopover(open ? column.id : null)
            }
            availableValues={availableDisplayNames}
            selectedValues={selectedValues}
            onSelectionChange={(values) =>
              setColumnFilterValues(column.id, values)
            }
            onClear={() => setColumnFilterValues(column.id, [])}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 relative",
                  selectedValues.length > 0 && "text-primary"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenFilterPopover(isOpen ? null : column.id);
                }}
              >
                <Filter className="h-3 w-3" />
                {selectedValues.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                    {selectedValues.length}
                  </span>
                )}
              </Button>
            }
          />
        </div>
      );
    },
    cell: ({ row }) => {
      const user = row.original;
      return <div className="font-medium">{user.displayName || "—"}</div>;
    },
    filterFn: (row, id, values) => {
      if (!values || values.length === 0) return true;
      const displayName = row.original.displayName || "";
      return values.includes(displayName);
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const email = row.getValue("email") as string;
      return <div className="text-muted-foreground">{email || "—"}</div>;
    },
  },
  {
    accessorKey: "manager.name",
    header: ({ column }) => {
      const selectedValues = getColumnFilterValues(column.id);
      const isOpen = openFilterPopover === column.id;
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Manager
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
          <FilterPopover
            isOpen={isOpen}
            onOpenChange={(open) =>
              setOpenFilterPopover(open ? column.id : null)
            }
            availableValues={availableManagers}
            selectedValues={selectedValues}
            onSelectionChange={(values) =>
              setColumnFilterValues(column.id, values)
            }
            onClear={() => setColumnFilterValues(column.id, [])}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 relative",
                  selectedValues.length > 0 && "text-primary"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenFilterPopover(isOpen ? null : column.id);
                }}
              >
                <Filter className="h-3 w-3" />
                {selectedValues.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                    {selectedValues.length}
                  </span>
                )}
              </Button>
            }
          />
        </div>
      );
    },
    cell: ({ row }) => {
      const manager = (row.original as any).manager;
      const managerName = manager?.displayName || manager?.name || "—";
      return <div className="text-muted-foreground">{managerName}</div>;
    },
    sortingFn: (rowA, rowB) => {
      const managerA = (rowA.original as any).manager;
      const managerB = (rowB.original as any).manager;
      const nameA = managerA?.displayName || managerA?.name || "";
      const nameB = managerB?.displayName || managerB?.name || "";
      return nameA.localeCompare(nameB);
    },
    filterFn: (row, id, values) => {
      if (!values || values.length === 0) return true;
      const manager = (row.original as any).manager;
      const managerName = manager?.displayName || manager?.name || "";
      return values.includes(managerName);
    },
  },
  {
    accessorKey: "attributes.department",
    header: ({ column }) => {
      const selectedValues = getColumnFilterValues(column.id);
      const isOpen = openFilterPopover === column.id;
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Department</span>
          <FilterPopover
            isOpen={isOpen}
            onOpenChange={(open) =>
              setOpenFilterPopover(open ? column.id : null)
            }
            availableValues={availableDepartments}
            selectedValues={selectedValues}
            onSelectionChange={(values) =>
              setColumnFilterValues(column.id, values)
            }
            onClear={() => setColumnFilterValues(column.id, [])}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6",
                  selectedValues.length > 0 && "text-primary"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenFilterPopover(isOpen ? null : column.id);
                }}
              >
                <Filter className="h-3 w-3" />
                {selectedValues.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                    {selectedValues.length}
                  </span>
                )}
              </Button>
            }
          />
        </div>
      );
    },
    cell: ({ row }) => {
      const department = row.original.attributes?.department;
      return <div className="text-muted-foreground">{department || "—"}</div>;
    },
    filterFn: (row, id, values) => {
      if (!values || values.length === 0) return true;
      const department = row.original.attributes?.department || "";
      return values.includes(department);
    },
  },
  {
    accessorKey: "attributes.costCenter",
    header: ({ column }) => {
      const selectedValues = getColumnFilterValues(column.id);
      const isOpen = openFilterPopover === column.id;
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Cost Center</span>
          <FilterPopover
            isOpen={isOpen}
            onOpenChange={(open) =>
              setOpenFilterPopover(open ? column.id : null)
            }
            availableValues={availableCostCenters}
            selectedValues={selectedValues}
            onSelectionChange={(values) =>
              setColumnFilterValues(column.id, values)
            }
            onClear={() => setColumnFilterValues(column.id, [])}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 relative",
                  selectedValues.length > 0 && "text-primary"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenFilterPopover(isOpen ? null : column.id);
                }}
              >
                <Filter className="h-3 w-3" />
                {selectedValues.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                    {selectedValues.length}
                  </span>
                )}
              </Button>
            }
          />
        </div>
      );
    },
    cell: ({ row }) => {
      const costCenter = row.original.attributes?.costCenter;
      return <div className="text-muted-foreground">{costCenter || "—"}</div>;
    },
    filterFn: (row, id, values) => {
      if (!values || values.length === 0) return true;
      const costCenter = row.original.attributes?.costCenter || "";
      return values.includes(costCenter);
    },
  },
  {
    accessorKey: "attributes.title",
    header: "Title",
    cell: ({ row }) => {
      const title = row.original.attributes?.title;
      return <div className="text-muted-foreground">{title || "—"}</div>;
    },
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) => {
      const user = row.original;
      const isSelected = selectedRequestees.find((u) => u.id === user.id);

      return (
        <div className="flex justify-center">
          {isSelected ? (
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7"
              disabled
            >
              <Check className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => onAddRequestee(user)}
              size="sm"
              variant="outline"
              className="h-7"
            >
              Add
            </Button>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
];

export function SelectIdentityStep({
  selectedRequestees,
  onAddRequestee,
  onRemoveRequestee,
}: SelectIdentityStepProps) {
  const [userSearchKeyword, setUserSearchKeyword] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<IdentityDocument[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [openFilterPopover, setOpenFilterPopover] = useState<string | null>(
    null
  );

  // Extract unique values for filters
  const availableDepartments = useMemo(() => {
    const departments = new Set<string>();
    searchResults.forEach((user) => {
      const dept = user.attributes?.department;
      if (dept) {
        departments.add(dept);
      }
    });
    return Array.from(departments).sort();
  }, [searchResults]);

  const availableCostCenters = useMemo(() => {
    const costCenters = new Set<string>();
    searchResults.forEach((user) => {
      const costCenter = user.attributes?.costCenter;
      if (costCenter) {
        costCenters.add(costCenter);
      }
    });
    return Array.from(costCenters).sort();
  }, [searchResults]);

  const availableManagers = useMemo(() => {
    const managers = new Set<string>();
    searchResults.forEach((user) => {
      const manager = (user as any).manager;
      const managerName = manager?.displayName || manager?.name;
      if (managerName) {
        managers.add(managerName);
      }
    });
    return Array.from(managers).sort();
  }, [searchResults]);

  const availableNames = useMemo(() => {
    const names = new Set<string>();
    searchResults.forEach((user) => {
      if (user.name) {
        names.add(user.name);
      }
    });
    return Array.from(names).sort();
  }, [searchResults]);

  const availableDisplayNames = useMemo(() => {
    const displayNames = new Set<string>();
    searchResults.forEach((user) => {
      if (user.displayName) {
        displayNames.add(user.displayName);
      }
    });
    return Array.from(displayNames).sort();
  }, [searchResults]);

  const getColumnFilterValues = (columnId: string): string[] => {
    const filter = columnFilters.find((f) => f.id === columnId);
    if (!filter) return [];
    const value = filter.value;
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === "string" && value) {
      return [value];
    }
    return [];
  };

  const setColumnFilterValues = (columnId: string, values: string[]) => {
    setColumnFilters((prev) => {
      const filtered = prev.filter((f) => f.id !== columnId);
      if (values.length > 0) {
        return [...filtered, { id: columnId, value: values }];
      }
      return filtered;
    });
  };

  const columns = useMemo(
    () =>
      createColumns(
        selectedRequestees,
        onAddRequestee,
        getColumnFilterValues,
        setColumnFilterValues,
        availableDepartments,
        availableCostCenters,
        availableManagers,
        availableNames,
        availableDisplayNames,
        openFilterPopover,
        setOpenFilterPopover
      ),
    [
      selectedRequestees,
      onAddRequestee,
      columnFilters,
      availableDepartments,
      availableCostCenters,
      availableManagers,
      availableNames,
      availableDisplayNames,
      openFilterPopover,
    ]
  );

  const table = useReactTable({
    data: searchResults,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  });

  const searchUsers = async () => {
    if (!userSearchKeyword.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearchingUsers(true);
    setShowResults(true);
    try {
      const result = await searchIdentities(userSearchKeyword);
      if ("error" in result) {
        toast.error(`Failed to search users: ${result.error}`);
        setSearchResults([]);
      } else {
        setSearchResults(result.users);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
      toast.error("Failed to search users. Please try again.");
    } finally {
      setIsSearchingUsers(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 py-2 px-4 bg-secondary">
        <CardTitle className="text-sm leading-tight">Select Identity</CardTitle>
        <CardDescription className="text-xs mt-0.5 leading-tight">
          Find and select users for whom you want to manage access
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 space-y-4 mt-2">
        <div className="space-y-2 flex-shrink-0">
          <Label htmlFor="requestee">Search Users</Label>
          <div className="min-h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <Input
                id="requestee"
                placeholder="Type keyword to search users..."
                value={userSearchKeyword}
                onChange={(e) => {
                  setUserSearchKeyword(e.target.value);
                  if (!e.target.value.trim()) {
                    setSearchResults([]);
                    setShowResults(false);
                  }
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
        </div>

        {/* Search Results Table */}
        {showResults && (
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <div className="flex items-center justify-between flex-shrink-0">
              <Label>Search Results</Label>
              <p className="text-xs text-muted-foreground">
                {isSearchingUsers
                  ? "Searching..."
                  : columnFilters.length > 0
                  ? `${table.getFilteredRowModel().rows.length} of ${
                      searchResults.length
                    } result${searchResults.length !== 1 ? "s" : ""} (filtered)`
                  : `${searchResults.length} result${
                      searchResults.length !== 1 ? "s" : ""
                    } found`}
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              {isSearchingUsers ? (
                <div className="flex items-center justify-center py-8 border rounded-md">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="border rounded-md">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <UserSearch className="h-6 w-6" />
                      </EmptyMedia>
                      <EmptyTitle>No Users Found</EmptyTitle>
                      <EmptyDescription>
                        No users found matching your search. Try a different
                        keyword.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : table.getFilteredRowModel().rows.length === 0 &&
                columnFilters.length > 0 ? (
                <div className="border rounded-md">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Filter className="h-6 w-6" />
                      </EmptyMedia>
                      <EmptyTitle>No Results Match Filters</EmptyTitle>
                      <EmptyDescription>
                        No users match your filter criteria. Try adjusting your
                        filters.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => {
                            return (
                              <TableHead key={header.id}>
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => {
                          const isSelected = selectedRequestees.find(
                            (u) => u.id === row.original.id
                          );
                          return (
                            <TableRow
                              key={row.id}
                              data-state={isSelected && "selected"}
                              className={isSelected ? "bg-accent/30" : ""}
                            >
                              {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={columns.length}
                            className="h-24 text-center"
                          >
                            No results.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
