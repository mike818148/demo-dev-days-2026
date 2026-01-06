"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Calendar as CalendarIcon,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IdentityDocument, RoleDocument } from "sailpoint-api-client";
import { DocumentActionButtons } from "@/components/component/document-action-buttons";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { cn, isRequestCommentsRequired } from "@/lib/utils";
import { checkIdentitiesForAccessToRole } from "@/lib/actions/isc";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface ReviewStepProps {
  selectedRequestees: IdentityDocument[];
  cart: RoleDocument[];
  onRemoveRequestee: (userId: string) => void;
  onRemoveFromCart: (roleId: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitError: string | null;
  roleComments?: Record<string, string>;
  onCommentChange?: (roleId: string, comment: string) => void;
  removalDates?: Record<string, string>;
  onRemovalDateChange?: (roleId: string, date: string) => void;
}

export function ReviewStep({
  selectedRequestees,
  cart,
  onRemoveRequestee,
  onRemoveFromCart,
  onSubmit,
  isSubmitting,
  submitError,
  roleComments,
  onCommentChange,
  removalDates,
  onRemovalDateChange,
}: ReviewStepProps) {
  const [bulkCommentDialogOpen, setBulkCommentDialogOpen] = useState(false);
  const [bulkComment, setBulkComment] = useState("");
  const [bulkRemovalDateDialogOpen, setBulkRemovalDateDialogOpen] =
    useState(false);
  const [bulkRemovalDate, setBulkRemovalDate] = useState<Date | undefined>(
    undefined
  );
  const [openBulkRemovalDateCalendar, setOpenBulkRemovalDateCalendar] =
    useState(false);
  // Track existing access: roleId -> array of user IDs that already have access
  const [existingAccessMap, setExistingAccessMap] = useState<
    Record<string, string[]>
  >({});
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  const isSubmitDisabled =
    cart.length === 0 || selectedRequestees.length === 0 || isSubmitting;

  const handleBulkAddComment = () => {
    if (!onCommentChange || !bulkComment.trim()) return;
    cart.forEach((role) => {
      onCommentChange(role.id, bulkComment);
    });
    setBulkComment("");
    setBulkCommentDialogOpen(false);
  };

  const handleBulkSetRemovalDate = () => {
    if (!onRemovalDateChange || !bulkRemovalDate) return;
    const dateString = bulkRemovalDate.toISOString().split("T")[0];
    cart.forEach((role) => {
      onRemovalDateChange(role.id, dateString);
    });
    setBulkRemovalDate(undefined);
    setBulkRemovalDateDialogOpen(false);
  };

  const handleBulkResetComments = () => {
    if (!onCommentChange) return;
    cart.forEach((role) => {
      onCommentChange(role.id, "");
    });
  };

  const handleBulkResetRemovalDates = () => {
    if (!onRemovalDateChange) return;
    cart.forEach((role) => {
      onRemovalDateChange(role.id, "");
    });
  };

  // Background process to check existing access
  useEffect(() => {
    const checkExistingAccess = async () => {
      // Only check if we have roles and requestees
      if (cart.length === 0 || selectedRequestees.length === 0) {
        setExistingAccessMap({});
        return;
      }

      setIsCheckingAccess(true);
      const identityIds = selectedRequestees.map((user) => user.id);
      const accessMap: Record<string, string[]> = {};

      // Check each role in parallel
      const checkPromises = cart.map(async (role) => {
        try {
          const result = await checkIdentitiesForAccessToRole(
            role.id,
            identityIds
          );
          if ("identitiesWithAccess" in result) {
            if (result.identitiesWithAccess.length > 0) {
              accessMap[role.id] = result.identitiesWithAccess;
            }
          }
        } catch (error) {
          // Silently fail - this is a background check
          console.error(`Error checking access for role ${role.id}:`, error);
        }
      });

      await Promise.all(checkPromises);
      setExistingAccessMap(accessMap);
      setIsCheckingAccess(false);
    };

    checkExistingAccess();
  }, [cart, selectedRequestees]);

  return (
    <div className="h-full w-full flex flex-col">
      {/* Bulk Action Buttons */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Dialog
          open={bulkCommentDialogOpen}
          onOpenChange={setBulkCommentDialogOpen}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Bulk Add Comment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Bulk Add Comment</DialogTitle>
              <DialogDescription>
                Add the same comment to all selected roles.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-comment">Comment</Label>
                <Textarea
                  id="bulk-comment"
                  placeholder="Enter comment to apply to all roles..."
                  value={bulkComment}
                  onChange={(e) => setBulkComment(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setBulkComment("");
                  setBulkCommentDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkAddComment}
                disabled={!bulkComment.trim()}
              >
                Apply to All
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={bulkRemovalDateDialogOpen}
          onOpenChange={setBulkRemovalDateDialogOpen}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Bulk Set Removal Date
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Bulk Set Removal Date</DialogTitle>
              <DialogDescription>
                Set the same removal date for all selected roles.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Removal Date</Label>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={bulkRemovalDate}
                    onSelect={setBulkRemovalDate}
                    disabled={(date: Date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    className="rounded-lg border"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setBulkRemovalDate(undefined);
                  setBulkRemovalDateDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkSetRemovalDate}
                disabled={!bulkRemovalDate}
              >
                Apply to All
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          size="sm"
          onClick={handleBulkResetComments}
          disabled={
            !cart.length ||
            !roleComments ||
            Object.keys(roleComments).length === 0
          }
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Comments
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleBulkResetRemovalDates}
          disabled={
            !cart.length ||
            !removalDates ||
            Object.keys(removalDates).length === 0
          }
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Removal Dates
        </Button>
      </div>

      {/* Resizable Panels */}
      <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
        {/* Left Column - Selected Users */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full pr-3">
            <Card className="h-full flex flex-col">
              <CardHeader className="py-2 px-4 bg-secondary">
                <CardTitle className="flex items-center gap-2 text-sm leading-tight">
                  Selected Users
                  <Badge variant="secondary" className="bg-blue-500 text-white">
                    {selectedRequestees.length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5 leading-tight">
                  Users selected for access request
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto min-h-0 mt-2">
                {selectedRequestees.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No users selected yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedRequestees.map((user) => {
                      const title = (user as any).attributes?.title;
                      const manager = (user as any).manager;
                      const managerName = manager?.displayName || manager?.name;
                      const department = user.attributes?.department;
                      const costCenter = user.attributes?.costCenter;

                      return (
                        <div
                          key={user.id}
                          className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">
                                {user.displayName || user.name}
                              </p>
                              {title && (
                                <Badge variant="outline" className="text-xs">
                                  {title}
                                </Badge>
                              )}
                            </div>
                            {user.email && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {user.email}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {user.name && (
                                <Badge variant="secondary" className="text-xs">
                                  Name: {user.name}
                                </Badge>
                              )}
                              {managerName && (
                                <Badge variant="secondary" className="text-xs">
                                  Manager: {managerName}
                                </Badge>
                              )}
                              {department && (
                                <Badge variant="secondary" className="text-xs">
                                  Department: {department}
                                </Badge>
                              )}
                              {costCenter && (
                                <Badge variant="secondary" className="text-xs">
                                  Cost Center: {costCenter}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <DocumentActionButtons document={user} />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={() => onRemoveRequestee(user.id)}
                              title="Remove user"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Column - Selected Roles (Add Access) */}
        <ResizablePanel defaultSize={50} minSize={40}>
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
                      const existingAccess = existingAccessMap[role.id] || [];
                      const hasExistingAccess = existingAccess.length > 0;
                      const usersWithAccess = selectedRequestees.filter(
                        (user) => existingAccess.includes(user.id)
                      );

                      return (
                        <div
                          key={role.id}
                          className={cn(
                            "rounded-lg border p-3 bg-card border-border",
                            hasExistingAccess &&
                              "border-warning/50 bg-warning/5"
                          )}
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
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-sm">
                                    {roleName}
                                  </p>
                                  {hasExistingAccess && (
                                    <Badge
                                      variant="outline"
                                      className="border-warning text-warning bg-warning/10"
                                    >
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Access Exists
                                    </Badge>
                                  )}
                                </div>
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
                                  {removalDates?.[role.id] && (
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
                                {hasExistingAccess && (
                                  <Alert variant="destructive" className="mt-3">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle className="text-sm">
                                      Access Already Exists
                                    </AlertTitle>
                                    <AlertDescription className="text-xs">
                                      The following users already have access to
                                      this role:
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {usersWithAccess.map((user) => (
                                          <Badge
                                            key={user.id}
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            {user.displayName || user.name}
                                          </Badge>
                                        ))}
                                      </div>
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isRequestCommentsRequired(role) &&
                                (!roleComments?.[role.id] ||
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
                    No roles selected yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Submit Button */}
      <div className="mt-4 pt-4 border-t space-y-2">
        <Button
          onClick={onSubmit}
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
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Submit Request
            </>
          )}
        </Button>
        {submitError && (
          <p className="text-sm text-destructive text-center">{submitError}</p>
        )}
      </div>
    </div>
  );
}
