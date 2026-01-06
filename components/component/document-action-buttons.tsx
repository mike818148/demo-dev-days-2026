"use client";

import { useState, useEffect } from "react";
import React from "react";
import {
  Info,
  MessageSquare,
  Calendar as CalendarIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDocumentById } from "@/lib/actions/isc";
import { RoleDocument, IdentityDocument } from "sailpoint-api-client";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";

interface DocumentActionButtonsProps {
  document: RoleDocument | IdentityDocument;
  roleComments?: Record<string, string>;
  onCommentChange?: (roleId: string, comment: string) => void;
  removalDates?: Record<string, string>;
  onRemovalDateChange?: (roleId: string, date: string) => void;
  showComment?: boolean;
  showRemovalDate?: boolean;
  isRequestCommentsRequired?: (role: RoleDocument) => boolean;
}

// Helper function to format type name for display
const formatTypeName = (type: string): string => {
  const typeLower = type.toLowerCase();

  // Handle special cases
  if (typeLower === "accessprofile" || typeLower === "access profile") {
    return "Access Profile";
  }
  if (typeLower === "identity") {
    return "Identity";
  }
  if (typeLower === "role") {
    return "Role";
  }
  if (typeLower === "entitlement") {
    return "Entitlement";
  }

  // Default: capitalize first letter and add space before capital letters
  return type
    .replace(/([A-Z])/g, " $1")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export function DocumentActionButtons({
  document,
  roleComments,
  onCommentChange,
  removalDates,
  onRemovalDateChange,
  showComment = false,
  showRemovalDate = false,
  isRequestCommentsRequired,
}: DocumentActionButtonsProps) {
  const [documentData, setDocumentData] = useState<any>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState<
    Array<{
      name: string;
      displayName?: string;
      id: string;
      type: string;
      collection: string;
    }>
  >([]);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [openRemovalDateCalendar, setOpenRemovalDateCalendar] = useState<
    string | null
  >(null);

  const loadDocument = async (
    id: string,
    collection: "roles" | "entitlements" | "accessprofiles" | "identities",
    name?: string,
    type?: string,
    addToBreadcrumb: boolean = true
  ) => {
    setIsLoadingDocument(true);
    setDocumentError(null);
    try {
      const result = await getDocumentById(collection, id);
      if ("error" in result) {
        setDocumentError(result.error);
      } else {
        setDocumentData(result.document);
        // Add to breadcrumb if name is provided and addToBreadcrumb is true
        if (name && addToBreadcrumb) {
          const doc = result.document as any;
          const displayName = doc.displayName || doc.name || name;
          setBreadcrumbPath((prev) => [
            ...prev,
            {
              name,
              displayName,
              id,
              type: type || collection,
              collection,
            },
          ]);
        }
      }
    } catch (error) {
      setDocumentError("Failed to load document");
      console.error("Error loading document:", error);
    } finally {
      setIsLoadingDocument(false);
    }
  };

  const handleNavigateToDocument = async (
    id: string,
    type: string,
    name: string
  ) => {
    // Determine collection based on type
    let collection: "roles" | "entitlements" | "accessprofiles" | "identities" =
      "roles";
    const typeLower = type?.toLowerCase() || "";
    if (typeLower.includes("role")) {
      collection = "roles";
    } else if (typeLower.includes("entitlement")) {
      collection = "entitlements";
    } else if (
      typeLower.includes("accessprofile") ||
      typeLower.includes("access profile")
    ) {
      collection = "accessprofiles";
    } else if (typeLower.includes("identity") || typeLower.includes("user")) {
      collection = "identities";
    }
    await loadDocument(id, collection, name, type);
  };

  // Helper function to render value in table (moved inside component to access handleNavigateToDocument)
  const renderValue = (value: any, key?: string): string | React.ReactNode => {
    if (value === null || value === undefined) return "—";

    // Special handling for accessModelMetadata
    if (key === "accessModelMetadata" && Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === "object" && item !== null) {
            const name = "name" in item ? item.name : "";
            const val = "value" in item ? item.value : "";
            return `${name}:${val || "—"}`;
          }
          return String(item);
        })
        .join(", ");
    }

    // Special handling for owner - make it a clickable button
    if (key === "owner" && typeof value === "object" && value !== null) {
      const ownerId = "id" in value ? value.id : null;
      const ownerName = "name" in value ? value.name : "Unknown";
      const ownerType = "type" in value ? value.type : "identity";
      if (ownerId) {
        return (
          <Button
            variant="link"
            className="h-auto p-0 font-mono text-xs underline"
            onClick={() =>
              handleNavigateToDocument(ownerId, ownerType, ownerName)
            }
          >
            {ownerName}
          </Button>
        );
      }
      return "name" in value ? String(value.name) : "—";
    }

    // Special handling for accessProfiles array
    if (key === "accessProfiles" && Array.isArray(value)) {
      return (
        <div className="flex flex-col gap-1">
          {value.map((item: any, index: number) => {
            if (typeof item === "object" && item !== null) {
              const profileId = item.id || null;
              const profileName = item.name || "Unknown";
              const profileType = item.type || "accessprofile";
              if (profileId) {
                return (
                  <Button
                    key={index}
                    variant="link"
                    className="h-auto p-0 font-mono text-xs underline justify-start"
                    onClick={() =>
                      handleNavigateToDocument(
                        profileId,
                        profileType,
                        profileName
                      )
                    }
                  >
                    {profileName}
                  </Button>
                );
              }
              return <span key={index}>{profileName}</span>;
            }
            return <span key={index}>{String(item)}</span>;
          })}
        </div>
      );
    }

    if (Array.isArray(value)) {
      // If it's an array, display the name attribute of each element
      return value
        .map((item) => {
          if (typeof item === "object" && item !== null && "name" in item) {
            return item.name;
          }
          return String(item);
        })
        .join(", ");
    }
    if (typeof value === "object") {
      // If it's an object, display the name attribute if it exists
      if ("name" in value && value.name !== null && value.name !== undefined) {
        return String(value.name);
      }
      // Fallback to JSON stringify if no name attribute
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const handleBreadcrumbClick = async (
    index: number,
    item: {
      name: string;
      displayName?: string;
      id: string;
      type: string;
      collection: string;
    }
  ) => {
    // Truncate breadcrumb path to the clicked item
    setBreadcrumbPath((prev) => prev.slice(0, index + 1));
    // Reload the document without adding to breadcrumb (since we already set it above)
    await loadDocument(
      item.id,
      item.collection as
        | "roles"
        | "entitlements"
        | "accessprofiles"
        | "identities",
      item.name,
      item.type,
      false // Don't add to breadcrumb since we've already set it
    );
  };

  const handleDialogOpenChange = async (open: boolean) => {
    if (open) {
      setBreadcrumbPath([]);
      setDocumentData(null);
      setDocumentError(null);
      // Only allow valid collection names for getDocumentById
      let collection:
        | "roles"
        | "entitlements"
        | "accessprofiles"
        | "identities";
      // Use a type property or fallback to "roles" if unavailable
      if ("type" in document && typeof document.type === "string") {
        switch (document.type.toLowerCase()) {
          case "role":
            collection = "roles";
            break;
          case "entitlement":
            collection = "entitlements";
            break;
          case "accessprofile":
            collection = "accessprofiles";
            break;
          case "identity":
            collection = "identities";
            break;
          default:
            collection = "roles";
        }
      } else {
        // Default to roles for RoleDocument, identities for IdentityDocument
        collection = "id" in document && document.id ? "roles" : "identities";
      }
      const docName =
        (document as any).name || (document as any).displayName || "Unnamed";
      const docDisplayName =
        (document as any).displayName || (document as any).name || docName;
      // Set initial breadcrumb item
      setBreadcrumbPath([
        {
          name: docName,
          displayName: docDisplayName,
          id: document.id,
          type: (document as any).type || collection,
          collection,
        },
      ]);
      await loadDocument(
        document.id,
        collection,
        docName,
        (document as any).type || collection,
        false // Don't add to breadcrumb again since we set it above
      );
    } else {
      setDocumentData(null);
      setDocumentError(null);
      setBreadcrumbPath([]);
    }
  };

  const isRole = (
    doc: RoleDocument | IdentityDocument
  ): doc is RoleDocument => {
    return "accessModelMetadata" in doc || (doc as any).type === "role";
  };

  const role = isRole(document) ? document : null;
  const requiresComment =
    role && isRequestCommentsRequired ? isRequestCommentsRequired(role) : false;
  const hasComment =
    role && roleComments
      ? !!(roleComments[role.id] && roleComments[role.id].trim() !== "")
      : false;

  return (
    <div className="flex items-center gap-2">
      {/* Info Button */}
      <Dialog onOpenChange={handleDialogOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="View details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[1200px] max-h-[80vh] flex flex-col p-0">
          {/* Fixed Header */}
          <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle>
                {breadcrumbPath.length > 0
                  ? `${formatTypeName(
                      breadcrumbPath[breadcrumbPath.length - 1].type
                    )} Details`
                  : "Document Details"}
              </DialogTitle>
              <DialogDescription>
                View detailed information about this{" "}
                {breadcrumbPath.length > 0
                  ? formatTypeName(
                      breadcrumbPath[breadcrumbPath.length - 1].type
                    ).toLowerCase()
                  : "document"}
              </DialogDescription>
            </DialogHeader>
            {breadcrumbPath.length > 0 && (
              <div className="pt-2">
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbPath.map((item, index) => {
                      // Use displayName if available, otherwise fall back to name
                      const displayName = item.displayName || item.name;
                      // Format type name properly
                      const formattedType = formatTypeName(item.type);
                      const breadcrumbLabel = `${formattedType}: ${displayName}`;

                      return (
                        <React.Fragment key={index}>
                          {index > 0 && <BreadcrumbSeparator />}
                          <BreadcrumbItem>
                            {index === breadcrumbPath.length - 1 ? (
                              <BreadcrumbPage>{breadcrumbLabel}</BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink
                                asChild
                                className="cursor-pointer"
                              >
                                <button
                                  onClick={() =>
                                    handleBreadcrumbClick(index, item)
                                  }
                                >
                                  {breadcrumbLabel}
                                </button>
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>
                        </React.Fragment>
                      );
                    })}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            )}
          </div>
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            {isLoadingDocument ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : documentError ? (
              <div className="text-sm text-destructive py-4">
                {documentError}
              </div>
            ) : documentData ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(documentData)
                    .filter(
                      ([key]) =>
                        key !== "attributes" &&
                        key !== "owns" &&
                        key !== "entitlements"
                    )
                    .map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell className="font-medium">{key}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {typeof renderValue(value, key) === "string" ? (
                            <pre className="whitespace-pre-wrap break-words">
                              {renderValue(value, key)}
                            </pre>
                          ) : (
                            renderValue(value, key)
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  {/* Flatten attributes object into individual rows */}
                  {documentData.attributes &&
                    typeof documentData.attributes === "object" &&
                    !Array.isArray(documentData.attributes) &&
                    Object.entries(documentData.attributes).map(
                      ([attrKey, attrValue]) => (
                        <TableRow key={`attributes.${attrKey}`}>
                          <TableCell className="font-medium">
                            {attrKey}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {typeof renderValue(attrValue, attrKey) ===
                            "string" ? (
                              <pre className="whitespace-pre-wrap break-words">
                                {renderValue(attrValue, attrKey)}
                              </pre>
                            ) : (
                              renderValue(attrValue, attrKey)
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  {/* Flatten owns object into individual rows */}
                  {documentData.owns &&
                    typeof documentData.owns === "object" &&
                    !Array.isArray(documentData.owns) &&
                    Object.entries(documentData.owns).map(
                      ([ownsKey, ownsValue]) => {
                        // Determine collection type and whether it's clickable
                        let collectionType = "roles";
                        let itemType = "role";
                        let isClickable = false;

                        if (ownsKey === "sources") {
                          // Sources are not clickable
                          isClickable = false;
                        } else if (ownsKey === "accessProfiles") {
                          collectionType = "accessprofiles";
                          itemType = "accessprofile";
                          isClickable = true;
                        } else if (ownsKey === "roles") {
                          collectionType = "roles";
                          itemType = "role";
                          isClickable = true;
                        } else if (ownsKey === "entitlements") {
                          collectionType = "entitlements";
                          itemType = "entitlement";
                          isClickable = true;
                        } else if (ownsKey === "governanceGroups") {
                          // Governance groups are not clickable
                          isClickable = false;
                        }

                        return (
                          <TableRow key={`owns.${ownsKey}`}>
                            <TableCell className="font-medium">
                              owns {ownsKey}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {Array.isArray(ownsValue) &&
                              ownsValue.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {ownsValue.map((item: any, index: number) => {
                                    if (
                                      typeof item === "object" &&
                                      item !== null
                                    ) {
                                      const itemId = item.id || null;
                                      const itemName = item.name || "Unknown";
                                      // Only make clickable if isClickable is true and item has an id
                                      if (isClickable && itemId) {
                                        return (
                                          <Button
                                            key={index}
                                            variant="link"
                                            className="h-auto p-0 font-mono text-xs underline justify-start"
                                            onClick={() =>
                                              handleNavigateToDocument(
                                                itemId,
                                                itemType,
                                                itemName
                                              )
                                            }
                                          >
                                            {itemName}
                                          </Button>
                                        );
                                      }
                                      // Not clickable - just display as text
                                      return (
                                        <span key={index}>{itemName}</span>
                                      );
                                    }
                                    return (
                                      <span key={index}>{String(item)}</span>
                                    );
                                  })}
                                </div>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      }
                    )}
                  {/* Flatten entitlements array into individual rows */}
                  {documentData.entitlements &&
                    Array.isArray(documentData.entitlements) &&
                    documentData.entitlements.length > 0 && (
                      <TableRow key="entitlements">
                        <TableCell className="font-medium">
                          entitlements
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <div className="flex flex-col gap-1">
                            {documentData.entitlements.map(
                              (item: any, index: number) => {
                                if (typeof item === "object" && item !== null) {
                                  const itemId = item.id || null;
                                  const itemName = item.name || "Unknown";
                                  const itemType = item.type || "entitlement";

                                  // Entitlements should navigate to entitlements collection
                                  if (itemId) {
                                    return (
                                      <Button
                                        key={index}
                                        variant="link"
                                        className="h-auto p-0 font-mono text-xs underline justify-start"
                                        onClick={() =>
                                          handleNavigateToDocument(
                                            itemId,
                                            itemType,
                                            itemName
                                          )
                                        }
                                      >
                                        {itemName}
                                      </Button>
                                    );
                                  }
                                  return <span key={index}>{itemName}</span>;
                                }
                                return <span key={index}>{String(item)}</span>;
                              }
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
              </Table>
            ) : null}
          </div>
          {/* Fixed Footer */}
          <div className="flex-shrink-0 px-6 py-4 border-t">
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comment Button - Only for roles */}
      {showComment && role && onCommentChange && (
        <Dialog
          open={commentDialogOpen}
          onOpenChange={(open) => {
            setCommentDialogOpen(open);
          }}
        >
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8",
                hasComment
                  ? "text-green-600 hover:text-green-700"
                  : requiresComment && !hasComment
                  ? "text-destructive"
                  : ""
              )}
              title={requiresComment ? "Comment required" : "Add comment"}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {requiresComment ? "Comment Required" : "Add Comment"}
              </DialogTitle>
              <DialogDescription>
                {requiresComment
                  ? "This access item requires a comment. Please provide details."
                  : "Add a comment for this access item (optional)."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="role-comment">
                  Comment
                  {requiresComment && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                <Textarea
                  id="role-comment"
                  placeholder="Enter your comment here..."
                  value={roleComments?.[role.id] || ""}
                  onChange={(e) => onCommentChange(role.id, e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Removal Date Button - Only for roles */}
      {showRemovalDate && role && onRemovalDateChange && (
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              removalDates?.[role.id]
                ? "text-green-600 hover:text-green-700"
                : ""
            )}
            title="Select removal date"
            onClick={() => {
              setOpenRemovalDateCalendar(
                openRemovalDateCalendar === role.id ? null : role.id
              );
            }}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
          {openRemovalDateCalendar === role.id && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpenRemovalDateCalendar(null)}
              />
              <div className="absolute right-0 z-50 mt-1 rounded-md border bg-popover shadow-md">
                <Calendar
                  mode="single"
                  selected={
                    removalDates?.[role.id]
                      ? new Date(removalDates[role.id])
                      : undefined
                  }
                  onSelect={(date: Date | undefined) => {
                    if (date) {
                      onRemovalDateChange(
                        role.id,
                        date.toISOString().split("T")[0]
                      );
                      setOpenRemovalDateCalendar(null);
                    }
                  }}
                  disabled={(date: Date) =>
                    date < new Date(new Date().setHours(0, 0, 0, 0))
                  }
                  className="rounded-lg border-0"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
